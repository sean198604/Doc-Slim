const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

let splashWindow = null;
let mainWindow = null;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "..", "LOGO.png"),
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.setMenuBarVisibility(false);
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    show: false,
    center: true,
    title: "文档瘦身工具 - EGO International",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "..", "LOGO.png"),
  });

  // 加载 Vite 构建产物
  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  mainWindow.setMenuBarVisibility(false);

  // 拦截外部链接，用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    // 延迟到 splash 显示完毕后再显示主窗口
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, 2800);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createSplash();
  createMain();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMain();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
