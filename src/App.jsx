import React, { useState, useRef, useCallback } from "react";
import JSZip from "jszip";

/* ============================
   配置区
============================ */
const CONFIG = {
  quality: 0.7,
  maxWidth: 1200,
  maxFileSize: 100 * 1024 * 1024, // 100MB
};

/* ============================
   工具函数
============================ */
const formatBytes = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const getFileExt = (name) => {
  const m = name.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : "";
};

/* ============================
   核心压缩逻辑
============================ */

// 图片压缩核心（Canvas 缩放 + JPEG 质量压缩）
const compressImage = async (blob, quality = CONFIG.quality, maxWidth = CONFIG.maxWidth) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("canvas toBlob failed"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Office 文件（Excel/PPT/Word）内部媒体压缩
const compressOffice = async (file, mediaPrefix, quality, maxWidth) => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const newZip = new JSZip();
  let total = 0, compressed = 0, skipped = 0;
  const entries = Object.keys(zip.files);

  for (const path of entries) {
    const f = zip.files[path];
    if (f.dir || path.endsWith("/")) { continue; } // 跳过目录条目（含 dir=false 的情况）

    let content;
    try {
      content = await f.async("blob");
    } catch (err) {
      // 读取失败直接跳过，不中断处理
      continue;
    }

    if (path.startsWith(mediaPrefix)) {
      total++;
      try {
        // 滑块参数透传进来
        const c = await compressImage(content, quality, maxWidth);
        // 图片被压缩才替换，否则保持原样
        if (c.size < content.size) {
          newZip.file(path, c);
          compressed++;
        } else {
          newZip.file(path, content);
          skipped++;
        }
      } catch {
        newZip.file(path, content); // 失败保留原文件
        skipped++;
      }
    } else {
      newZip.file(path, content);
    }
  }

  const blob = await newZip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { blob, total, compressed, skipped };
};

/* ============================
   主组件
============================ */
export default function App() {
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState({ type: "idle", msg: "", progress: 0 });
  const [history, setHistory] = useState([]);
  const [quality, setQuality] = useState(70);
  const [maxW, setMaxW] = useState(1200);
  const fileRef = useRef(null);

  // 统一的文件处理入口
  const processFile = useCallback(async (file) => {
    const ext = getFileExt(file.name);
    const state = (t, m, p = 0) => setState({ type: t, msg: m, progress: p });

    if (file.size > CONFIG.maxFileSize) {
      state("error", "⚠️ 文件超过 100MB，暂不支持");
      return;
    }

    state("loading", "📂 正在分析文件结构...");

    try {
      let result, blob, summary;

      if (ext === "xlsx") {
        state("loading", "🖼️ 正在压缩 Excel 内嵌图片...");
        result = await compressOffice(file, "xl/media/", quality / 100, maxW);
        blob = result.blob;
        summary = `Excel 压缩完成：处理 ${result.total} 张图片，成功压缩 ${result.compressed} 张`;
      } else if (ext === "pptx") {
        state("loading", "🖼️ 正在压缩 PPT 内嵌图片...");
        result = await compressOffice(file, "ppt/media/", quality / 100, maxW);
        blob = result.blob;
        summary = `PPT 压缩完成：处理 ${result.total} 张图片，成功压缩 ${result.compressed} 张`;
      } else if (ext === "docx") {
        state("loading", "🖼️ 正在压缩 Word 内嵌图片...");
        result = await compressOffice(file, "word/media/", quality / 100, maxW);
        blob = result.blob;
        summary = `Word 压缩完成：处理 ${result.total} 张图片，成功压缩 ${result.compressed} 张`;
      } else if (/^(jpg|jpeg|png|gif|bmp|webp)$/.test(ext)) {
        state("loading", "🖼️ 正在压缩图片...");
        blob = await compressImage(file, quality / 100, maxW);
        summary = `图片压缩完成：${formatBytes(file.size)} → ${formatBytes(blob.size)}，减少 ${((1 - blob.size / file.size) * 100).toFixed(1)}%`;
      } else {
        state("error", "❌ 不支持的文件类型，仅支持：xlsx / pptx / docx / 图片");
        return;
      }

      // 下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = file.name.replace(/\.[^.]+$/, "");
      a.download = `${base}_瘦身.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      const ratio = ((1 - blob.size / file.size) * 100).toFixed(1);
      setHistory((h) => [
        {
          name: file.name,
          orig: formatBytes(file.size),
          slim: formatBytes(blob.size),
          ratio: ratio > 0 ? `↓${ratio}%` : "≈持平",
          time: new Date().toLocaleTimeString(),
        },
        ...h.slice(0, 9),
      ]);

      state("done", `✅ ${summary}`);
    } catch (err) {
      console.error(err);
      state("error", "❌ 处理失败：" + (err.message || "未知错误"));
    }
  }, [quality, maxW]);

  // 拖拽 & 点击
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
    e.target.value = "";
  };

  const stateColor = {
    idle: "#666",
    loading: "#1890ff",
    done: "#52c41a",
    error: "#ff4d4f",
    info: "#faad14",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#fff", padding: "28px 20px 22px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>文档瘦身工具</h1>
        </div>
        <p style={{ fontSize: 13, opacity: 0.85 }}>Excel · PPT · Word · 图片 — 全能压缩，单文件输出</p>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 40px" }}>

        {/* 上传区 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? "#667eea" : "#c9d1e8"}`,
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            background: dragging ? "#f0f4ff" : "#fff",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 12px rgba(102,126,234,0.1)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {dragging ? "📥" : "📤"}
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 6 }}>
            {dragging ? "松开以上传" : "点击上传 / 拖拽文件到这里"}
          </p>
          <p style={{ fontSize: 13, color: "#999" }}>
            支持 xlsx / pptx / docx / 图片
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.pptx,.docx,.jpg,.jpeg,.png,.gif,.bmp,.webp"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* 设置区 */}
        <div style={{
          marginTop: 16,
          background: "#fff",
          borderRadius: 12,
          padding: "16px 20px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12, fontWeight: 600 }}>⚙️ 压缩设置（仅对图片文件生效）</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>
                图片质量 <span style={{ color: "#667eea", fontWeight: 700 }}>{quality}%</span>
              </label>
              <input
                type="range" min="30" max="100" step="5" value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#667eea" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginTop: 2 }}>
                <span>高压缩</span><span>高画质</span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 6 }}>
                最大宽度 <span style={{ color: "#667eea", fontWeight: 700 }}>{maxW}px</span>
              </label>
              <input
                type="range" min="400" max="2400" step="100" value={maxW}
                onChange={(e) => setMaxW(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#667eea" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginTop: 2 }}>
                <span>小文件</span><span>高分辨率</span>
              </div>
            </div>
          </div>
        </div>

        {/* 状态区 */}
        {(state.type === "loading" || state.type === "done" || state.type === "error" || state.type === "info") && (
          <div style={{
            marginTop: 16,
            background: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            borderLeft: `4px solid ${stateColor[state.type]}`,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}>
            <p style={{ color: stateColor[state.type], fontSize: 14, fontWeight: 500 }}>
              {state.msg}
            </p>
            {state.type === "loading" && (
              <div style={{ marginTop: 10, height: 4, background: "#eee", borderRadius: 2 }}>
                <div style={{
                  height: "100%", background: "linear-gradient(90deg, #667eea, #764ba2)",
                  borderRadius: 2, width: "70%", animation: "pulse 1.5s infinite",
                }} />
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div style={{
          marginTop: 20,
          background: "#fff",
          borderRadius: 12,
          padding: "16px 20px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 10, fontWeight: 600 }}>💡 使用说明</p>
          <ul style={{ fontSize: 13, color: "#555", paddingLeft: 18, lineHeight: "1.9" }}>
            <li>文档必须提前解密再上传！⚠️</li>
            <li>Excel / PPT / Word：自动压缩内部图片，保持公式文字样式不变</li>
            <li>图片：调整尺寸 + 降低质量，减少文件体积</li>
            <li>所有处理在本地浏览器完成，不上传服务器，隐私安全</li>
          </ul>
        </div>

        {/* 历史记录 */}
        {history.length > 0 && (
          <div style={{
            marginTop: 20,
            background: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 10, fontWeight: 600 }}>📋 最近记录</p>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "#aaa", borderBottom: "1px solid #f0f0f0" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px 8px" }}>文件名</th>
                  <th style={{ textAlign: "right", padding: "4px 8px 8px" }}>原大小</th>
                  <th style={{ textAlign: "right", padding: "4px 8px 8px" }}>瘦身后</th>
                  <th style={{ textAlign: "right", padding: "4px 8px 8px" }}>效果</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f9f9f9", color: "#555" }}>
                    <td style={{ padding: "6px 8px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px" }}>{h.orig}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px" }}>{h.slim}</td>
                    <td style={{ textAlign: "right", padding: "6px 8px", color: h.ratio.startsWith("↓") ? "#52c41a" : "#888" }}>{h.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: "#ccc" }}>
          本地处理 · 不上传 · 隐私安全
        </p>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { width: 70%; }
          50% { width: 95%; }
        }
        input[type="range"] { -webkit-appearance: none; height: 4px; border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #667eea; cursor: pointer; }
        @media (max-width: 480px) {
          main { padding: 16px 12px 40px !important; }
        }
      `}</style>
    </div>
  );
}
