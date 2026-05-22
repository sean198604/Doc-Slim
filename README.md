# 文档瘦身工具 (Doc Slim)

> ⚡ WORK HARD, WORK SMART, HAVE FUN!

本地化 Office 文档压缩工具，纯浏览器端处理，无需上传服务器。支持 Excel、PowerPoint、Word、图片和 PDF 文件，通过智能图片压缩大幅减少文档体积。

---

## 📋 项目信息

| 项目 | 详情 |
|---|---|
| **名称** | 文档瘦身工具 (Doc Slim) |
| **版本** | 1.0.1 |
| **品牌** | EGO International |
| **端口** | 7001 |
| **部署** | Docker (Nginx) / Electron 便携 exe |
| **仓库** | [sean198604/doc-slim](https://github.com/sean198604/doc-slim) |

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + Vite 5 |
| 文件解析 | JSZip 3.10 |
| 图片处理 | HTML5 Canvas API |
| 桌面版 | Electron 31 + electron-builder |
| Web 部署 | Nginx Alpine + Docker Compose |
| 样式方案 | 内联样式 + CSS Animations |

## ✨ 功能特性

- 🗜️ **Office 文档深度压缩** — 自动解析 `.xlsx`、`.pptx`、`.docx` 内部 ZIP 结构，提取媒体文件并压缩后重新打包，保持公式、文字、样式不变
- 🖼️ **图片智能缩放** — Canvas 重绘 + JPEG 质量调整，可自定义最大宽度和压缩质量
- 📊 **实时压缩反馈** — 显示处理进度、原文件大小、压缩后大小、节省百分比
- 📋 **历史记录** — 保留最近压缩记录，支持文件名、原大小、瘦身后、效果对比
- ⚙️ **可调参数** — 滑动调节图片质量 (30%-100%) 和最大宽度 (400px-2400px)
- 🔒 **本地处理 · 零上传** — 所有计算在浏览器端完成，文件不离开本机
- 💿 **便携版 exe** — Electron 打包为单文件 `.exe`，约 70MB，即开即用
- ⚡ **品牌启动动画** — 桌面版含自定义 splash screen

## 📁 支持格式

| 格式 | 处理方式 | 说明 |
|---|---|---|
| `.xlsx` | 内部图片压缩 | 压缩 `xl/media/` 下图片，公式/数据不变 |
| `.pptx` | 内部图片压缩 | 压缩 `ppt/media/` 下图片，排版/动画不变 |
| `.docx` | 内部图片压缩 | 压缩 `word/media/` 下图片，格式/样式不变 |
| `.jpg/.jpeg` | 缩放+质量 | Canvas 重绘，JPEG 输出 |
| `.png/.gif/.bmp/.webp` | 缩放+质量 | Canvas 重绘，JPEG 输出 |
| `.pdf` | 轻量处理 | 当前为浅层处理，深度压缩需服务端支持 |

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
    ├── 图片文件 (.jpg/.png/.gif/.bmp/.webp)
    │   └─► Canvas 缩放 + JPEG 压缩
    │       └─► 输出 .blob → 自动下载
    │
    └── PDF
        └─► 轻量处理提醒
```

## 🚀 快速启动

### Web 版 (Docker)

```bash
docker compose up -d
# 访问 http://localhost:7001
```

### Web 版 (本地开发)

```bash
npm install
npm run dev
# 访问 http://localhost:7001
```

### 桌面版

```bash
# 1. 构建前端
npm run build

# 2. 开发模式
npm run electron:dev

# 3. 打包便携 exe
npm run electron:build
# 输出: release/文档瘦身工具-1.0.1-portable.exe
```

## 📂 项目结构

```
doc-slim/
├── src/
│   ├── App.jsx              # 主组件：上传、压缩、状态、历史
│   ├── main.jsx             # React 入口
│   └── index.css            # 全局样式
├── electron/
│   ├── main.js              # Electron 主进程（splash + 主窗口）
│   └── splash.html          # 启动动画页面
├── public/
│   └── favicon.svg          # ⚡ 图标
├── Dockerfile               # Nginx Alpine 镜像
├── docker-compose.yml       # Docker Compose 编排
├── nginx.conf               # Nginx 配置（静态资源缓存、Gzip）
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

### Docker 部署

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

### Electron 打包

打包配置在 `package.json` 的 `build` 字段中：

- 目标：Windows x64 便携版
- 图标：`LOGO.png`
- 文件：仅打包 `dist/` + `electron/` + 静态资源
- 输出命名：`文档瘦身工具-{version}-portable.exe`

## 📝 注意事项

1. **加密文档**：受密码保护的 Office 文件无法直接处理，需先解密
2. **PDF 限制**：当前 PDF 压缩为基础处理，复杂 PDF 优化建议使用专业工具
3. **图片格式**：所有图片统一输出为 JPEG 格式（为达到最佳压缩比）
4. **文件大小**：单文件上限 100MB，可在 CONFIG 中调整
5. **浏览器兼容**：依赖 Canvas API 和 JSZip，支持所有现代浏览器

## 🔒 隐私安全

所有文件处理完全在本地浏览器或 Electron 应用中完成，**不会上传到任何服务器**。Nginx 仅用于托管静态页面，不含任何后端处理逻辑。
