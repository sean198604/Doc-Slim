# Doc-Slim · 文档瘦身工具

> ⚡ Office 文档压缩工具 — 企业效率平台功能模块  
> ⚡ Office document compression tool — a feature of an enterprise internal efficiency platform.

---

<details open>
<summary><b>📋 中文</b></summary>

## 📋 项目信息

| 项目 | 详情 |
|---|---|
| **名称** | Doc-Slim（文档瘦身工具） |
| **版本** | 1.0.1 |
| **端口** | 7001 |
| **部署** | Docker (Nginx) |
| **仓库** | [sean198604/doc-slim](https://github.com/sean198604/doc-slim) |

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + Vite 5 |
| 文件解析 | JSZip 3.10 |
| 图片处理 | HTML5 Canvas API |
| Web 部署 | Nginx Alpine + Docker Compose |
| 样式 | CSS Animations + 内联样式 |

## ✨ 功能特性

- 🗜️ **Office 文档深度压缩** — 解析 `.xlsx`、`.pptx`、`.docx` 内部 ZIP 结构，提取媒体文件并压缩后重新打包，保持公式、文字、样式不变
- 🖼️ **图片智能缩放** — Canvas 重绘 + JPEG 质量调整，可自定义最大宽度和压缩质量
- 📊 **实时压缩反馈** — 显示处理进度、原文件大小、压缩后大小、节省百分比
- 📋 **历史记录** — 保留最近压缩记录，支持文件名、原大小、瘦身后、效果对比
- ⚙️ **可调参数** — 滑动调节图片质量 (30%-100%) 和最大宽度 (400px-2400px)
- 🔒 **本地处理 · 零上传** — 所有计算在浏览器端完成，文件不离开本机

## 📁 支持格式

| 格式 | 处理方式 | 说明 |
|---|---|---|
| `.xlsx` | 内部图片压缩 | 压缩 `xl/media/` 下图片，公式/数据不变 |
| `.pptx` | 内部图片压缩 | 压缩 `ppt/media/` 下图片，排版/动画不变 |
| `.docx` | 内部图片压缩 | 压缩 `word/media/` 下图片，格式/样式不变 |
| `.jpg/.jpeg` | 缩放+质量 | Canvas 重绘，JPEG 输出 |
| `.png/.gif/.bmp/.webp` | 缩放+质量 | Canvas 重绘，JPEG 输出 |

> ⚠️ **注意**：加密的 Office 文档需提前解密后再上传！

## 🔧 压缩流程

```
用户上传文件
    │
    ├── Office 文档 (.xlsx/.pptx/.docx)
    │   └─► JSZip 解析 ZIP 结构
    │       └─► 遍历 media/ 目录图片
    │           └─► Canvas 缩放 + JPEG 压缩
    │               └─► JSZip 重新打包 (DEFLATE level 6)
    │                   └─► 输出 .blob → 自动下载
    │
    └── 图片文件 (.jpg/.png/.gif/.bmp/.webp)
        └─► Canvas 缩放 + JPEG 压缩
            └─► 输出 .blob → 自动下载
```

## 🚀 快速启动

### Docker 部署

```bash
docker compose up -d
# 访问 http://localhost:7001
```

### 本地开发

```bash
npm install
npm run dev
# 访问 http://localhost:7001
```

## 📂 项目结构

```
doc-slim/
├── src/
│   ├── App.jsx              # 主组件：上传、压缩、状态、历史
│   ├── main.jsx             # React 入口
│   └── index.css            # 全局样式
├── public/
│   └── favicon.svg          # ⚡ 图标
├── Dockerfile               # Nginx Alpine 镜像
├── docker-compose.yml       # Docker Compose 编排
├── nginx.conf               # Nginx 配置（静态缓存、Gzip）
├── vite.config.js           # Vite 构建配置 (base: './')
└── package.json             # 依赖与构建脚本
```

## ⚙️ 配置说明

压缩参数在 `src/App.jsx` 中的 `CONFIG` 对象定义，运行时可通过 UI 滑块调整：

| 参数 | 默认值 | 范围 | 说明 |
|---|---|---|---|
| `quality` | 0.7 (70%) | 30%-100% | JPEG 压缩质量，越低体积越小 |
| `maxWidth` | 1200px | 400px-2400px | 图片最大宽度，超出等比缩放 |
| `maxFileSize` | 100MB | — | 单文件上传大小上限 |

## 🔨 构建部署

```bash
# 构建镜像并启动
docker compose up -d --build

# 查看日志
docker logs doc-slim-7001

# 停止
docker compose down
```

**Nginx 特性**：
- 静态资源 1 年强缓存 (`Cache-Control: public, immutable`)
- Gzip 压缩传输
- SPA 路由 fallback (`try_files $uri /index.html`)

## 📝 注意事项

1. **加密文档**：受密码保护的 Office 文件无法直接处理，需先解密
2. **图片格式**：所有图片统一输出为 JPEG 格式（为达到最佳压缩比）
3. **文件大小**：单文件上限 100MB，可在 CONFIG 中调整
4. **浏览器兼容**：依赖 Canvas API 和 JSZip，支持所有现代浏览器

## 🔒 隐私安全

所有文件处理完全在本地浏览器中完成，**不会上传到任何服务器**。Nginx 仅用于托管静态页面，不含任何后端处理逻辑。

---

本项目属于**企业效率平台**功能模块，为内部工作流提供文档压缩能力。面向希望在不上传第三方服务的前提下减小文件体积的组织和团队。

</details>

<details>
<summary><b>📋 English</b></summary>

## 📋 Project Info

| Item | Detail |
|---|---|
| **Name** | Doc-Slim |
| **Version** | 1.0.1 |
| **Port** | 7001 |
| **Deployment** | Docker (Nginx) |
| **Repository** | [sean198604/doc-slim](https://github.com/sean198604/doc-slim) |

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + Vite 5 |
| File Parsing | JSZip 3.10 |
| Image Processing | HTML5 Canvas API |
| Web Deployment | Nginx Alpine + Docker Compose |
| Styling | CSS Animations + Inline Styles |

## ✨ Features

- 🗜️ **Office Document Deep Compression** — Parses `.xlsx`, `.pptx`, `.docx` ZIP internals, extracts and compresses media files, then repacks. Formulas, text, and styles are preserved.
- 🖼️ **Intelligent Image Scaling** — Canvas redraw + JPEG quality adjustment. Configurable max width and compression quality.
- 📊 **Real-time Feedback** — Displays progress, original size, compressed size, and savings percentage.
- 📋 **History** — Retains recent compression records with before/after comparison.
- ⚙️ **Adjustable Parameters** — Sliders for image quality (30%–100%) and max width (400px–2400px).
- 🔒 **Local Processing, Zero Upload** — All computation happens in the browser. Files never leave the machine.

## 📁 Supported Formats

| Format | Processing | Notes |
|---|---|---|
| `.xlsx` | Internal image compression | Compresses images in `xl/media/`. Formulas/data preserved. |
| `.pptx` | Internal image compression | Compresses images in `ppt/media/`. Layout/animations preserved. |
| `.docx` | Internal image compression | Compresses images in `word/media/`. Formatting preserved. |
| `.jpg/.jpeg` | Scale + quality | Canvas redraw, JPEG output. |
| `.png/.gif/.bmp/.webp` | Scale + quality | Canvas redraw, JPEG output. |

> ⚠️ **Note**: Password-protected Office files must be decrypted first.

## 🔧 Compression Flow

```
User uploads file
    │
    ├── Office documents (.xlsx/.pptx/.docx)
    │   └─► JSZip parses ZIP structure
    │       └─► Traverses media/ directory images
    │           └─► Canvas scale + JPEG compression
    │               └─► JSZip repacks (DEFLATE level 6)
    │                   └─► Output .blob → auto-download
    │
    └── Image files (.jpg/.png/.gif/.bmp/.webp)
        └─► Canvas scale + JPEG compression
            └─► Output .blob → auto-download
```

## 🚀 Quick Start

### Docker

```bash
docker compose up -d
# Visit http://localhost:7001
```

### Local Development

```bash
npm install
npm run dev
# Visit http://localhost:7001
```

## 📂 Project Structure

```
doc-slim/
├── src/
│   ├── App.jsx              # Main component: upload, compress, status, history
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── public/
│   └── favicon.svg          # ⚡ icon
├── Dockerfile               # Nginx Alpine image
├── docker-compose.yml       # Docker Compose
├── nginx.conf               # Nginx config (static caching, Gzip)
├── vite.config.js           # Vite build config (base: './')
└── package.json             # Dependencies & scripts
```

## ⚙️ Configuration

Compression parameters are defined in the `CONFIG` object within `src/App.jsx` and can be adjusted at runtime via UI sliders:

| Parameter | Default | Range | Description |
|---|---|---|---|
| `quality` | 0.7 (70%) | 30%–100% | JPEG compression quality. Lower = smaller. |
| `maxWidth` | 1200px | 400px–2400px | Max image width. Larger images are scaled down proportionally. |
| `maxFileSize` | 100MB | — | Single file upload size limit. |

## 🔨 Build & Deploy

```bash
# Build image and start
docker compose up -d --build

# View logs
docker logs doc-slim-7001

# Stop
docker compose down
```

**Nginx Features**:
- Static assets cached for 1 year (`Cache-Control: public, immutable`)
- Gzip compression
- SPA route fallback (`try_files $uri /index.html`)

## 📝 Notes

1. **Encrypted Documents**: Password-protected Office files cannot be processed directly. Decrypt first.
2. **Image Format**: All images are output as JPEG for optimal compression ratio.
3. **File Size**: Single file cap is 100MB. Adjustable in CONFIG.
4. **Browser Compatibility**: Requires Canvas API and JSZip. Works on all modern browsers.

## 🔒 Privacy & Security

All file processing is done entirely in the browser. **Nothing is uploaded to any server.** Nginx serves only static pages with no backend processing logic.

---

This project is part of an **enterprise internal efficiency platform**, providing document compression capabilities for internal workflows. Built for organizations looking to reduce file sizes without third-party services.

</details>
