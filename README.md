# DOC-SLIM

> ⚡ Office document compression tool — a feature of an enterprise internal efficiency platform.

Browser-side document compression — no server upload required. Compresses Excel, PowerPoint, Word, and images by intelligently reducing embedded media sizes while preserving formatting, formulas, and layout.

---

## 📋 Project Info

| Item | Detail |
|---|---|
| **Name** | DOC-SLIM |
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

### Docker

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
