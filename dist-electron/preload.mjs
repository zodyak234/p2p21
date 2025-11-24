"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  // Custom APIs
  startStream: (magnetUri) => electron.ipcRenderer.invoke("start-stream", magnetUri),
  playWithMpv: (url) => electron.ipcRenderer.invoke("play-with-mpv", url),
  // Aria2 APIs
  getAria2Config: () => electron.ipcRenderer.invoke("get-aria2-config"),
  updateAria2Config: (config) => electron.ipcRenderer.invoke("update-aria2-config", config),
  getDownloadStatus: (gid) => electron.ipcRenderer.invoke("get-download-status", gid),
  removeDownload: (gid) => electron.ipcRenderer.invoke("remove-download", gid),
  // Event listeners
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    electron.ipcRenderer.on("download-progress", subscription);
    return () => electron.ipcRenderer.removeListener("download-progress", subscription);
  },
  onDownloadComplete: (callback) => {
    const subscription = (event, data) => callback(data);
    electron.ipcRenderer.on("download-complete", subscription);
    return () => electron.ipcRenderer.removeListener("download-complete", subscription);
  },
  onDownloadError: (callback) => {
    const subscription = (event, data) => callback(data);
    electron.ipcRenderer.on("download-error", subscription);
    return () => electron.ipcRenderer.removeListener("download-error", subscription);
  }
});
