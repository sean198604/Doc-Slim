<div align="center">

# ⚡ Doc-Slim · 文档瘦身工具 / Document Slimming Tool

> 企业级 Office 文档与图片压缩工具 — 邮件附件、OA 上传、资料归档前的一站式瘦身方案。本地处理零上传，一键压缩 xlsx / pptx / docx 与批量图片。

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

**关键词 / Keywords**：邮件附件压缩 · 图片批量压缩 · Office 文档瘦身 · xlsx/pptx/docx 压缩 · 企业邮箱附件限制 · 本地压缩工具 ·
email attachment compressor · batch image compression · Office document size reducer · compress PPT before sending ·
enterprise document tools · client-side file compression · JSZip · 不上传服务器

---

## 目录

- [🚀 快速部署](#-快速部署)
- [🏢 企业应用场景](#-企业应用场景)
- [✨ 核心特性](#-核心特性)
- [📁 支持格式](#-支持格式)
- [📐 设计要点](#-设计要点)
- [🔒 隐私与安全](#-隐私与安全)
- [🛠 FAQ](#-faq)
- [English](#english)

---

## 🚀 快速部署

### Docker Compose（推荐）

```bash
git clone https://github.com/sean198604/doc-slim.git
cd doc-slim
docker compose up -d
# 访问 http://localhost:7001
```

### 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:7001
```

### 构建部署

```bash
docker compose up -d --build   # 构建镜像并启动
docker logs doc-slim-7001      # 查看日志
docker compose down            # 停止
```

---

## 🏢 企业应用场景

### 📧 邮件发送前压缩图片（典型场景）

企业邮箱普遍有附件大小限制（如 Outlook 20MB、腾讯企业邮 25MB）。产品照片、活动合影、合同扫描件动辄几十 MB，直接发送会被退回或阻塞发送队列。

> **工作流**：发件前 → 打开 Doc-Slim → 拖入图片（支持批量）→ 一键压缩 → 下载 ZIP → 拖入邮件 → 发送成功 ✓

批量图片压缩后通常可减小 **70%~90%**，同时保持可读画质，彻底告别「附件超限」退回邮件。

### 🏢 OA / CRM / ERP 附件上传

内部系统附件大小限制（常见 5MB~20MB）经常拦截高分辨率图片和图文报表。压缩后再上传，秒传成功，不占存储配额。

### 📊 会议材料与产品资料归档

一份带大量图片的 PPT 动辄 30~50MB，归档、分发、跨团队传输都很痛苦。Doc-Slim 压缩内部图片后通常可降至原体积的 **1/3~1/5**，公式、动画、排版全部保留。

### 🤝 跨团队 / 跨组织文件传输

微信、企业微信、网盘等渠道均有大小限制。发前先瘦身，传输更快、失败更少。

---

## ✨ 核心特性

- 🗜️ **Office 文档深度压缩** — 解析 `.xlsx` / `.pptx` / `.docx` 内部 ZIP 结构，精准压缩 `media/` 目录下的图片后重新打包，**公式、文字、样式、动画全部保留**
- 🖼️ **图片智能缩放** — Canvas 重绘 + JPEG 质量调节，可自定义最大宽度与压缩质量
- 📦 **批量图片压缩** — 多张图片同时上传、逐张压缩、打包 ZIP 下载，附总压缩率统计
- 📋 **压缩对比反馈** — 实时展示原大小 → 压缩后大小 → 节省百分比
- ⚙️ **可调参数** — 图片质量（30%-100%）与最大宽度（400px-2400px）滑杆实时调节
- 🔒 **本地处理 · 零上传** — 所有计算在浏览器端完成，文件不离开本机，无隐私风险

---

## 📁 支持格式

| 格式 | 处理方式 | 说明 |
|---|---|---|
| `.xlsx` | 内部图片压缩 | 压缩 `xl/media/` 下图片，公式 / 数据不变 |
| `.pptx` | 内部图片压缩 | 压缩 `ppt/media/` 下图片，排版 / 动画不变 |
| `.docx` | 内部图片压缩 | 压缩 `word/media/` 下图片，格式 / 样式不变 |
| `.jpg` / `.jpeg` | 缩放 + 质量 | Canvas 重绘，JPEG 输出 |
| `.png` / `.gif` / `.bmp` / `.webp` | 缩放 + 质量 | Canvas 重绘，JPEG 输出 |

> ⚠️ **注意**：受密码保护的加密 Office 文档需提前解密后再上传。

---

## 📐 设计要点

1. **纯前端零后端** — 单页应用 + Nginx 静态托管，无任何服务端处理逻辑，部署即静态站点
2. **浏览器本地压缩** — 基于 Canvas API 重绘图片 + JPEG 重编码，JSZip 在浏览器内完成 ZIP 解析与重打包，文件全程不离开用户设备
3. **压缩参数可调** — 质量 / 宽度滑杆透传至压缩管线，兼顾「高压缩」与「高画质」两种场景诉求
4. **容错设计** — 单个媒体文件读取或压缩失败自动跳过，不中断整个文档处理流程
5. **Nginx 性能优化** — 静态资源 1 年强缓存（`Cache-Control: public, immutable`）+ Gzip 传输压缩

---

## 🔒 隐私与安全

所有文件处理**完全在本地浏览器中完成，不会上传到任何服务器**。Nginx 仅托管静态页面，不含任何后端处理逻辑。适用于对数据合规敏感的企业环境——无需安装第三方软件，打开网页即用。

---

## 🛠 FAQ

- **邮件附件超限怎么办？** → 发送前先用本工具压缩图片或文档，批量图片打包 ZIP 后发送
- **压缩后图片变模糊？** → 调高「图片质量」滑杆或增大「最大宽度」
- **加密文档无法处理？** → Office 加密文件需先解密再上传
- **压缩后的文件格式？** → 图片统一输出 JPEG（最优压缩比），Office 文档保持原格式
- **文件有上限吗？** → 单文件 100MB 上限，超大图片会自动跳过

---

## English

**Doc-Slim** is an enterprise-ready, client-side document and image compressor built with React + Vite. It slims down `.xlsx`, `.pptx`, `.docx` files by compressing their embedded images, and batch-compresses standalone images into a downloadable ZIP — all in the browser, nothing is uploaded.

### Typical Use Cases

- **Email attachments**: compress product photos and scanned contracts before sending to stay under mailbox attachment limits (e.g., Outlook 20MB).
- **OA / ERP uploads**: shrink high-resolution images to fit intranet attachment limits.
- **Archiving & distribution**: cut large PPT/Word decks to 1/3~1/5 of their size before sharing.
- **Team file transfer**: compress image batches to ZIP for faster, more reliable delivery.

### Features

- Deep compression of Office internals — formulas, layouts and styles preserved
- Canvas-based image resizing + JPEG quality control (quality & max-width sliders)
- Batch image upload → per-image compression → single ZIP download
- 100% local processing with zero upload — privacy-safe for enterprise data
- Static deployment via Docker Compose + Nginx (port 7001)

### Quick Start

```bash
docker compose up -d          # then open http://localhost:7001
# or
npm install && npm run dev
```

## License

[MIT](LICENSE)
