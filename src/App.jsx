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

const isImageFile = (name) => /^(jpg|jpeg|png|gif|bmp|webp)$/.test(getFileExt(name));

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
    if (f.dir || path.endsWith("/")) { continue; }

    let content;
    try {
      content = await f.async("blob");
    } catch (err) {
      continue;
    }

    if (path.startsWith(mediaPrefix)) {
      total++;
      try {
        const c = await compressImage(content, quality, maxWidth);
        if (c.size < content.size) {
          newZip.file(path, c);
          compressed++;
        } else {
          newZip.file(path, content);
          skipped++;
        }
      } catch {
        newZip.file(path, content);
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

  // 批量图片相关状态
  const [batchDragging, setBatchDragging] = useState(false);
  const [batchItems, setBatchItems] = useState([]); // { id, file, status, origSize, compSize, ratio }
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchZipping, setBatchZipping] = useState(false); // ZIP 打包加载态
  const batchRef = useRef(null);
  const batchIdRef = useRef(0);

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
      } else if (isImageFile(file.name)) {
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
      a.download = `${base}_瘦身.${ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "bmp" || ext === "webp" ? "jpg" : ext}`;
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

  // ========== 批量图片压缩 ==========

  // 添加批量图片
  const addBatchFiles = (fileList) => {
    const newItems = [];
    for (const f of fileList) {
      if (!isImageFile(f.name)) continue;
      if (f.size > CONFIG.maxFileSize) continue; // 跳过超大文件
      batchIdRef.current += 1;
      newItems.push({
        id: batchIdRef.current,
        file: f,
        status: "pending", // pending / processing / done / error
        origSize: f.size,
        compSize: 0,
        ratio: "",
      });
    }
    if (newItems.length === 0) return;
    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const onBatchDrop = (e) => {
    e.preventDefault();
    setBatchDragging(false);
    addBatchFiles(e.dataTransfer.files);
  };

  const onBatchFileChange = (e) => {
    if (e.target.files.length > 0) addBatchFiles(e.target.files);
    e.target.value = "";
  };

  // 移除单张
  const removeBatchItem = (id) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 清空列表
  const clearBatch = () => {
    setBatchItems([]);
  };

  // 开始批量压缩
  const startBatchCompress = async () => {
    const pending = batchItems.filter((item) => item.status === "pending" || item.status === "error");
    if (pending.length === 0) return;

    setBatchProcessing(true);

    for (const item of pending) {
      // 标记处理中
      setBatchItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "processing" } : i))
      );

      try {
        const compressedBlob = await compressImage(item.file, quality / 100, maxW);
        const compSize = compressedBlob.size;
        const ratio = ((1 - compSize / item.origSize) * 100).toFixed(1);

        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "done", compSize, ratio: ratio > 0 ? `↓${ratio}%` : "≈持平", _blob: compressedBlob }
              : i
          )
        );
      } catch {
        setBatchItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "error", ratio: "失败" } : i))
        );
      }
    }

    setBatchProcessing(false);
  };

  // 批量下载：打包成 ZIP
  const downloadBatchZip = async () => {
    const doneItems = batchItems.filter((i) => i.status === "done" && i._blob);
    if (doneItems.length === 0) return;

    setBatchZipping(true);
    try {
      const zip = new JSZip();
      for (const item of doneItems) {
        const base = item.file.name.replace(/\.[^.]+$/, "");
        zip.file(`${base}_瘦身.jpg`, item._blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `批量瘦身_${doneItems.length}张.zip`;
      a.click();
      URL.revokeObjectURL(url);

      // 清理 Blob 引用，释放内存
      setBatchItems((prev) =>
        prev.map((i) => (i._blob ? { ...i, _blob: undefined } : i))
      );
    } finally {
      setBatchZipping(false);
    }
  };

  // 批量统计
  const batchDoneItems = batchItems.filter((i) => i.status === "done");
  const batchTotalOrig = batchDoneItems.reduce((s, i) => s + i.origSize, 0);
  const batchTotalComp = batchDoneItems.reduce((s, i) => s + i.compSize, 0);
  const batchTotalRatio = batchTotalOrig > 0 ? ((1 - batchTotalComp / batchTotalOrig) * 100).toFixed(1) : "0";

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
        <p style={{ fontSize: 13, opacity: 0.85 }}>Excel · PPT · Word · 图片 — 全能压缩，单文件 / 批量输出</p>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 40px" }}>

        {/* 单文件上传区 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? "#667eea" : "#c9d1e8"}`,
            borderRadius: 16,
            padding: "36px 24px",
            textAlign: "center",
            background: dragging ? "#f0f4ff" : "#fff",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 12px rgba(102,126,234,0.1)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {dragging ? "📥" : "📤"}
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>
            {dragging ? "松开以上传" : "单文件上传 — 点击或拖拽"}
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

        {/* 批量图片上传区 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setBatchDragging(true); }}
          onDragLeave={() => setBatchDragging(false)}
          onDrop={onBatchDrop}
          onClick={() => batchRef.current.click()}
          style={{
            marginTop: 16,
            border: `2px dashed ${batchDragging ? "#f59e0b" : "#e5d5a0"}`,
            borderRadius: 16,
            padding: "36px 24px",
            textAlign: "center",
            background: batchDragging ? "#fffbeb" : "#fffdf5",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 12px rgba(245,158,11,0.08)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>
            {batchDragging ? "📥" : "🖼️"}
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>
            {batchDragging ? "松开以添加图片" : "批量图片压缩 — 点击或拖拽多张图片"}
          </p>
          <p style={{ fontSize: 13, color: "#999" }}>
            支持多选 jpg / png / gif / bmp / webp，压缩后打包 ZIP 下载
          </p>
          <input
            ref={batchRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.bmp,.webp"
            multiple
            onChange={onBatchFileChange}
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
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12, fontWeight: 600 }}>⚙️ 压缩设置（对图片文件生效）</p>
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

        {/* 批量图片列表 */}
        {batchItems.length > 0 && (
          <div style={{
            marginTop: 16,
            background: "#fff",
            borderRadius: 12,
            padding: "16px 20px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>
                📋 批量列表（{batchItems.length} 张）
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {!batchProcessing && batchItems.some((i) => i.status === "pending" || i.status === "error") && (
                  <button
                    onClick={startBatchCompress}
                    disabled={batchZipping}
                    style={{
                      padding: "6px 16px",
                      background: batchZipping ? "#e5e7eb" : "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: batchZipping ? "#999" : "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: batchZipping ? "not-allowed" : "pointer",
                    }}
                  >
                    🚀 开始压缩
                  </button>
                )}
                {!batchProcessing && batchDoneItems.length > 0 && (
                  <button
                    onClick={downloadBatchZip}
                    disabled={batchZipping}
                    style={{
                      padding: "6px 16px",
                      background: batchZipping ? "#94a3b8" : "linear-gradient(135deg, #059669, #10b981)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: batchZipping ? "not-allowed" : "pointer",
                    }}
                  >
                    {batchZipping ? "⏳ 打包中..." : `📦 下载 ZIP（${batchDoneItems.length} 张）`}
                  </button>
                )}
                <button
                  onClick={clearBatch}
                  disabled={batchProcessing || batchZipping}
                  style={{
                    padding: "6px 12px",
                    background: "#f5f5f5",
                    color: "#999",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: (batchProcessing || batchZipping) ? "not-allowed" : "pointer",
                  }}
                >
                  清空
                </button>
              </div>
            </div>

            {/* 批量统计条 */}
            {batchDoneItems.length > 0 && (
              <div style={{
                marginBottom: 12,
                padding: "10px 14px",
                background: batchTotalComp < batchTotalOrig ? "#f0fdf4" : "#fefce8",
                borderRadius: 8,
                fontSize: 13,
                color: "#333",
              }}>
                总计 {batchDoneItems.length} 张已压缩：
                {formatBytes(batchTotalOrig)} → {formatBytes(batchTotalComp)}
                {batchTotalRatio > 0 && (
                  <span style={{ color: "#16a34a", fontWeight: 700 }}> ↓{batchTotalRatio}%</span>
                )}
              </div>
            )}

            {/* 文件列表 */}
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "#aaa", borderBottom: "1px solid #f0f0f0" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px 8px" }}>文件名</th>
                    <th style={{ textAlign: "right", padding: "4px 8px 8px" }}>原大小</th>
                    <th style={{ textAlign: "right", padding: "4px 8px 8px" }}>压缩后</th>
                    <th style={{ textAlign: "center", padding: "4px 8px 8px" }}>状态</th>
                    <th style={{ padding: "4px 8px 8px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {batchItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f9f9f9", color: "#555" }}>
                      <td style={{ padding: "6px 8px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.file.name}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 8px" }}>
                        {formatBytes(item.origSize)}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px 8px" }}>
                        {item.status === "done" ? formatBytes(item.compSize) : "—"}
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 8px" }}>
                        {item.status === "pending" && <span style={{ color: "#aaa" }}>等待</span>}
                        {item.status === "processing" && <span style={{ color: "#1890ff" }}>⏳ 压缩中</span>}
                        {item.status === "done" && <span style={{ color: "#52c41a" }}>✅ {item.ratio}</span>}
                        {item.status === "error" && <span style={{ color: "#ff4d4f" }}>❌ 失败</span>}
                      </td>
                      <td style={{ padding: "6px 4px", textAlign: "center" }}>
                        {!batchProcessing && !batchZipping && (
                          <span
                            onClick={() => removeBatchItem(item.id)}
                            style={{ cursor: "pointer", color: "#ccc", fontSize: 16 }}
                            title="移除"
                          >
                            ×
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <li>单文件模式：Excel / PPT / Word / 单张图片压缩后直接下载</li>
            <li>批量模式：多张图片同时压缩，打包为 ZIP 下载</li>
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
