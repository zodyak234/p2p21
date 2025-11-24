import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;

// Aria2 Configuration
interface Aria2Config {
    url: string;
    secret?: string;
    downloadDir?: string;
}

// Store active downloads
const activeDownloads = new Map<string, { gid: string; magnetUri: string }>();

// Aria2 RPC Client
let aria2Config: Aria2Config = {
    url: 'http://192.168.1.26:6800/jsonrpc',
    secret: '', // Add your aria2 RPC secret here if needed
    downloadDir: '' // aria2 will use its configured download directory
};

// Update aria2 config (can be called from renderer)
function updateAria2Config(config: Partial<Aria2Config>) {
    aria2Config = { ...aria2Config, ...config };
    console.log('Aria2 config updated:', aria2Config);
}

// Aria2 RPC call helper
async function aria2Call(method: string, params: any[] = []): Promise<any> {
    const finalParams = aria2Config.secret
        ? [`token:${aria2Config.secret}`, ...params]
        : params;

    const payload = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method,
        params: finalParams
    };

    console.log('Aria2 RPC:', method, params);

    try {
        const response = await fetch(aria2Config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    } catch (error: any) {
        console.error('Aria2 RPC failed:', error);
        throw new Error(`Failed to connect to aria2: ${error.message}`);
    }
}

// IPC Handler for Streaming with Aria2
ipcMain.handle('start-stream', async (_event, magnetUri) => {
    console.log('Received magnet URI for aria2:', magnetUri);

    try {
        // Add download to aria2
        const options: Record<string, string> = {};

        // Set download directory if configured
        if (aria2Config.downloadDir) {
            options['dir'] = aria2Config.downloadDir;
        }

        const gid = await aria2Call('aria2.addUri', [[magnetUri], options]);
        console.log('Download added to aria2 with GID:', gid);

        // Store the download info
        activeDownloads.set(magnetUri, { gid, magnetUri });

        // Start monitoring progress
        const progressInterval = setInterval(async () => {
            try {
                const status = await aria2Call('aria2.tellStatus', [gid]);

                const totalLength = parseInt(status.totalLength || '0');
                const completedLength = parseInt(status.completedLength || '0');
                const downloadSpeed = parseInt(status.downloadSpeed || '0');
                const progress = totalLength > 0 ? completedLength / totalLength : 0;

                if (win && !win.isDestroyed()) {
                    win.webContents.send('download-progress', {
                        infoHash: gid,
                        gid: gid,
                        progress: progress,
                        downloadSpeed: downloadSpeed,
                        numPeers: parseInt(status.connections || '0'),
                        ready: status.status === 'complete',
                        status: status.status,
                        files: status.files || []
                    });
                }

                // If download is complete, clear interval
                if (status.status === 'complete') {
                    clearInterval(progressInterval);

                    // Find video file
                    const files = status.files || [];
                    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
                    const videoFile = files.find((f: any) => {
                        const ext = f.path.toLowerCase().slice(f.path.lastIndexOf('.'));
                        return videoExtensions.includes(ext);
                    });

                    if (videoFile && win && !win.isDestroyed()) {
                        win.webContents.send('download-complete', {
                            gid: gid,
                            filePath: videoFile.path
                        });
                    }
                }

                // If download failed, clear interval
                if (status.status === 'error' || status.status === 'removed') {
                    clearInterval(progressInterval);
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('download-error', {
                            gid: gid,
                            error: status.errorMessage || 'Download failed'
                        });
                    }
                }
            } catch (error: any) {
                console.error('Error checking download status:', error);
                clearInterval(progressInterval);
            }
        }, 1000);

        // Return the GID immediately
        return { gid, status: 'started' };

    } catch (error: any) {
        console.error('Error adding download to aria2:', error);
        throw error;
    }
});

// IPC Handler to get aria2 config
ipcMain.handle('get-aria2-config', async () => {
    return aria2Config;
});

// IPC Handler to update aria2 config
ipcMain.handle('update-aria2-config', async (_event, config: Partial<Aria2Config>) => {
    updateAria2Config(config);
    return aria2Config;
});

// IPC Handler to get download status
ipcMain.handle('get-download-status', async (_event, gid: string) => {
    try {
        const status = await aria2Call('aria2.tellStatus', [gid]);
        return status;
    } catch (error: any) {
        console.error('Error getting download status:', error);
        throw error;
    }
});

// IPC Handler to remove download
ipcMain.handle('remove-download', async (_event, gid: string) => {
    try {
        await aria2Call('aria2.remove', [gid]);
        return { success: true };
    } catch (error: any) {
        console.error('Error removing download:', error);
        throw error;
    }
});

// IPC Handler for MPV
ipcMain.handle('play-with-mpv', async (event, streamUrl) => {
    console.log('Launching MPV with URL:', streamUrl);
    const { spawn } = await import('child_process');
    const path = await import('path');

    // Use absolute path to MPV
    const mpvPath = path.join('C:', 'Users', 'Main PC', 'Desktop', 'mpv', 'mpv.exe');

    const mpvProcess = spawn(mpvPath, [streamUrl, '--force-window'], {
        stdio: 'ignore',
        detached: true
    });

    mpvProcess.unref();
    return 'MPV Launched';
});

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString());
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST, 'index.html'));
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        win = null;
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(createWindow);
