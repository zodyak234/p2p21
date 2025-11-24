import { app, ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const activeDownloads = /* @__PURE__ */ new Map();
let aria2Config = {
  url: "http://192.168.1.26:6800/jsonrpc",
  secret: "",
  // Add your aria2 RPC secret here if needed
  downloadDir: ""
  // aria2 will use its configured download directory
};
function updateAria2Config(config) {
  aria2Config = { ...aria2Config, ...config };
  console.log("Aria2 config updated:", aria2Config);
}
async function aria2Call(method, params = []) {
  const finalParams = aria2Config.secret ? [`token:${aria2Config.secret}`, ...params] : params;
  const payload = {
    jsonrpc: "2.0",
    id: Date.now().toString(),
    method,
    params: finalParams
  };
  console.log("Aria2 RPC:", method, params);
  try {
    const response = await fetch(aria2Config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`Aria2 Error: ${data.error.message} (Code: ${data.error.code})`);
    }
    return data.result;
  } catch (error) {
    console.error("Aria2 RPC failed:", error);
    throw new Error(`Failed to connect to aria2: ${error.message}`);
  }
}
ipcMain.handle("start-stream", async (_event, magnetUri) => {
  console.log("Received magnet URI for aria2:", magnetUri);
  try {
    const options = {};
    if (aria2Config.downloadDir) {
      options["dir"] = aria2Config.downloadDir;
    }
    const gid = await aria2Call("aria2.addUri", [[magnetUri], options]);
    console.log("Download added to aria2 with GID:", gid);
    activeDownloads.set(magnetUri, { gid, magnetUri });
    const progressInterval = setInterval(async () => {
      try {
        const status = await aria2Call("aria2.tellStatus", [gid]);
        const totalLength = parseInt(status.totalLength || "0");
        const completedLength = parseInt(status.completedLength || "0");
        const downloadSpeed = parseInt(status.downloadSpeed || "0");
        const progress = totalLength > 0 ? completedLength / totalLength : 0;
        if (win && !win.isDestroyed()) {
          win.webContents.send("download-progress", {
            infoHash: gid,
            gid,
            progress,
            downloadSpeed,
            numPeers: parseInt(status.connections || "0"),
            ready: status.status === "complete",
            status: status.status,
            files: status.files || []
          });
        }
        if (status.status === "complete") {
          clearInterval(progressInterval);
          const files = status.files || [];
          const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"];
          const videoFile = files.find((f) => {
            const ext = f.path.toLowerCase().slice(f.path.lastIndexOf("."));
            return videoExtensions.includes(ext);
          });
          if (videoFile && win && !win.isDestroyed()) {
            win.webContents.send("download-complete", {
              gid,
              filePath: videoFile.path
            });
          }
        }
        if (status.status === "error" || status.status === "removed") {
          clearInterval(progressInterval);
          if (win && !win.isDestroyed()) {
            win.webContents.send("download-error", {
              gid,
              error: status.errorMessage || "Download failed"
            });
          }
        }
      } catch (error) {
        console.error("Error checking download status:", error);
        clearInterval(progressInterval);
      }
    }, 1e3);
    return { gid, status: "started" };
  } catch (error) {
    console.error("Error adding download to aria2:", error);
    throw error;
  }
});
ipcMain.handle("get-aria2-config", async () => {
  return aria2Config;
});
ipcMain.handle("update-aria2-config", async (_event, config) => {
  updateAria2Config(config);
  return aria2Config;
});
ipcMain.handle("get-download-status", async (_event, gid) => {
  try {
    const status = await aria2Call("aria2.tellStatus", [gid]);
    return status;
  } catch (error) {
    console.error("Error getting download status:", error);
    throw error;
  }
});
ipcMain.handle("remove-download", async (_event, gid) => {
  try {
    await aria2Call("aria2.remove", [gid]);
    return { success: true };
  } catch (error) {
    console.error("Error removing download:", error);
    throw error;
  }
});
ipcMain.handle("play-with-mpv", async (event, streamUrl) => {
  console.log("Launching MPV with URL:", streamUrl);
  const { spawn } = await import("child_process");
  const path2 = await import("path");
  const mpvPath = path2.join("C:", "Users", "Main PC", "Desktop", "mpv", "mpv.exe");
  const mpvProcess = spawn(mpvPath, [streamUrl, "--force-window"], {
    stdio: "ignore",
    detached: true
  });
  mpvProcess.unref();
  return "MPV Launched";
});
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
