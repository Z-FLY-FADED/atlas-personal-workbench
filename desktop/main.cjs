/* eslint-disable @typescript-eslint/no-require-imports -- Electron main process uses CommonJS. */
const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const PORT = Number(process.env.ATLAS_PORT || 3002);
const APP_URL = `http://localhost:${PORT}/`;
const APP_ORIGIN = new URL(APP_URL).origin;

let mainWindow;

function isProjectRoot(candidate) {
  if (!candidate) return false;

  return (
    fs.existsSync(path.join(candidate, "package.json")) &&
    fs.existsSync(path.join(candidate, "scripts", "start-workbench.ps1"))
  );
}

function getRuntimePaths(projectRoot) {
  const runtimePath = path.join(projectRoot, ".runtime");
  return {
    runtimePath,
    stdoutPath: path.join(runtimePath, "workbench.out.log"),
    stderrPath: path.join(runtimePath, "workbench.err.log"),
    desktopLogPath: path.join(runtimePath, "desktop-startup.log"),
  };
}

function writeDesktopLog(projectRoot, message) {
  if (!projectRoot) return;

  try {
    const { runtimePath, desktopLogPath } = getRuntimePaths(projectRoot);
    fs.mkdirSync(runtimePath, { recursive: true });
    fs.appendFileSync(
      desktopLogPath,
      `[${new Date().toISOString()}] ${message}\n`,
      "utf8",
    );
  } catch {
    // Logging must never prevent the desktop shell from opening.
  }
}

function resolveProjectRoot() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const candidates = [
    process.env.ATLAS_PROJECT_ROOT,
    process.cwd(),
    portableDir ? path.resolve(portableDir, "..") : undefined,
    path.resolve(__dirname, ".."),
    path.resolve(process.resourcesPath, "..", ".."),
  ];

  const projectRoot = candidates.find(isProjectRoot);
  if (!projectRoot) {
    throw new Error(
      "无法定位工作台项目目录。请从项目内启动，或设置 ATLAS_PROJECT_ROOT。",
    );
  }

  return projectRoot;
}

function isWorkbenchReady(timeout = 1200) {
  return new Promise((resolve) => {
    const request = http.get(APP_URL, { timeout }, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

async function waitForWorkbench(timeout = 50_000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await isWorkbenchReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function resolveNodeExecutable() {
  const candidates = [
    process.env.ATLAS_NODE_PATH,
    path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe"),
    process.env["ProgramFiles(x86)"]
      ? path.join(process.env["ProgramFiles(x86)"], "nodejs", "node.exe")
      : undefined,
  ];
  const nodePath = candidates.find((candidate) => candidate && fs.existsSync(candidate));

  if (!nodePath) {
    throw new Error("未找到 Node.js，请安装 Node.js 后重新打开工作台。");
  }

  return nodePath;
}

function startWorkbench(projectRoot) {
  const nodePath = resolveNodeExecutable();
  const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
  if (!fs.existsSync(vinextCli)) {
    throw new Error("工作台运行依赖缺失，请在项目目录完成依赖安装。");
  }

  const { runtimePath, stdoutPath, stderrPath } = getRuntimePaths(projectRoot);
  fs.mkdirSync(runtimePath, { recursive: true });
  const stdout = fs.openSync(stdoutPath, "a");
  const stderr = fs.openSync(stderrPath, "a");

  writeDesktopLog(projectRoot, `Starting vinext on port ${PORT} with ${nodePath}`);

  return new Promise((resolve, reject) => {
    const child = spawn(
      nodePath,
      [vinextCli, "dev", "--port", String(PORT)],
      {
        cwd: projectRoot,
        detached: false,
        env: {
          ...process.env,
          WRANGLER_LOG_PATH: path.join(projectRoot, ".wrangler", "wrangler.log"),
        },
        stdio: ["ignore", stdout, stderr],
        windowsHide: true,
      },
    );

    const closeLogHandles = () => {
      try {
        fs.closeSync(stdout);
        fs.closeSync(stderr);
      } catch {
        // Child process owns duplicated handles after spawn.
      }
    };

    child.once("error", (error) => {
      closeLogHandles();
      writeDesktopLog(projectRoot, `Spawn failed: ${error.message}`);
      reject(error);
    });
    child.once("spawn", () => {
      closeLogHandles();
      child.unref();
      writeDesktopLog(projectRoot, `vinext process spawned with PID ${child.pid}`);
      resolve(child.pid);
    });
    child.once("exit", (code, signal) => {
      writeDesktopLog(
        projectRoot,
        `vinext process exited with code ${String(code)} and signal ${String(signal)}`,
      );
    });
  });
}

function getWindowIcon() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon-512.png");
  }

  return path.resolve(__dirname, "..", "public", "icon-512.png");
}

function showStartupError(error, projectRoot) {
  const errorText = error instanceof Error ? error.message : String(error);
  const logPath = projectRoot
    ? path.join(projectRoot, ".runtime", "desktop-startup.log")
    : "项目目录下的 .runtime/workbench.err.log";
  const html = `<!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ATLAS 启动失败</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 32px; background: #f5f2eb; color: #22201d; font-family: "Microsoft YaHei UI", "Segoe UI", sans-serif; }
          main { width: min(680px, 100%); padding: clamp(28px, 5vw, 48px); border: 1px solid #ded7c8; border-radius: 24px; background: rgba(255,255,255,.88); box-shadow: 0 24px 80px rgba(66,54,35,.12); }
          small { color: #ad7620; font-weight: 700; letter-spacing: .18em; }
          h1 { margin: 14px 0 12px; font-size: clamp(30px, 5vw, 46px); font-weight: 500; }
          p { color: #655f56; line-height: 1.8; }
          code { display: block; margin-top: 18px; padding: 16px; overflow-wrap: anywhere; border-radius: 12px; background: #f0ece3; color: #544a3c; }
          a { display: inline-flex; margin-top: 22px; padding: 12px 18px; border-radius: 12px; background: #a66f1b; color: white; font-weight: 700; text-decoration: none; }
        </style>
      </head>
      <body>
        <main>
          <small>ATLAS DESKTOP</small>
          <h1>工作台暂时无法启动</h1>
          <p>${escapeHtml(errorText)}</p>
          <p>请关闭此窗口后重新打开桌面快捷方式。若问题持续，请查看启动日志：</p>
          <code>${escapeHtml(logPath)}</code>
          <a href="${APP_URL}">重新连接</a>
        </main>
      </body>
    </html>`;

  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f2eb",
    icon: getWindowIcon(),
    title: "ATLAS 个人工作台",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, "loading.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_ORIGIN)) {
      mainWindow.loadURL(url);
    } else if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const destination = new URL(url);
    if (destination.protocol === "file:" || destination.protocol === "data:") {
      return;
    }

    if (destination.origin !== APP_ORIGIN) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

async function boot() {
  let projectRoot;

  try {
    projectRoot = resolveProjectRoot();
    writeDesktopLog(projectRoot, `Desktop boot started from ${process.cwd()}`);
    if (!(await isWorkbenchReady())) await startWorkbench(projectRoot);

    if (!(await waitForWorkbench())) {
      throw new Error(`本地服务未能在端口 ${PORT} 上响应。`);
    }

    writeDesktopLog(projectRoot, `Workbench ready at ${APP_URL}`);
    await mainWindow.loadURL(APP_URL);
  } catch (error) {
    writeDesktopLog(
      projectRoot,
      `Desktop boot failed: ${error instanceof Error ? error.stack || error.message : String(error)}`,
    );
    showStartupError(error, projectRoot);
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("com.compus.atlas.workspace");
    createWindow();
    void boot();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        void boot();
      }
    });
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

process.on("uncaughtException", (error) => {
  if (mainWindow) showStartupError(error);
  else dialog.showErrorBox("ATLAS 启动失败", error.message);
});
