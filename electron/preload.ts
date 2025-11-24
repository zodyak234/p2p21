import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args
        return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },
    // Custom APIs
    startStream: (magnetUri: string) => ipcRenderer.invoke('start-stream', magnetUri),
    playWithMpv: (url: string) => ipcRenderer.invoke('play-with-mpv', url),

    // Aria2 APIs
    getAria2Config: () => ipcRenderer.invoke('get-aria2-config'),
    updateAria2Config: (config: any) => ipcRenderer.invoke('update-aria2-config', config),
    getDownloadStatus: (gid: string) => ipcRenderer.invoke('get-download-status', gid),
    removeDownload: (gid: string) => ipcRenderer.invoke('remove-download', gid),

    // Event listeners
    onDownloadProgress: (callback: (data: any) => void) => {
        const subscription = (event: any, data: any) => callback(data);
        ipcRenderer.on('download-progress', subscription);
        return () => ipcRenderer.removeListener('download-progress', subscription);
    },
    onDownloadComplete: (callback: (data: any) => void) => {
        const subscription = (event: any, data: any) => callback(data);
        ipcRenderer.on('download-complete', subscription);
        return () => ipcRenderer.removeListener('download-complete', subscription);
    },
    onDownloadError: (callback: (data: any) => void) => {
        const subscription = (event: any, data: any) => callback(data);
        ipcRenderer.on('download-error', subscription);
        return () => ipcRenderer.removeListener('download-error', subscription);
    }
})
