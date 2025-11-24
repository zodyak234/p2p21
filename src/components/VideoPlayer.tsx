import React, { useEffect, useState } from 'react';

declare global {
    interface Window {
        ipcRenderer: {
            startStream: (magnetUri: string) => Promise<any>;
            playWithMpv: (url: string) => Promise<void>;
            getAria2Config: () => Promise<any>;
            updateAria2Config: (config: any) => Promise<any>;
            getDownloadStatus: (gid: string) => Promise<any>;
            removeDownload: (gid: string) => Promise<any>;
            onDownloadProgress: (callback: (data: any) => void) => () => void;
            onDownloadComplete: (callback: (data: any) => void) => () => void;
            onDownloadError: (callback: (data: any) => void) => () => void;
        };
    }
}


export const VideoPlayer: React.FC = () => {
    const [downloadGid, setDownloadGid] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadSpeed, setDownloadSpeed] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState<string>('idle');
    const [videoFilePath, setVideoFilePath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listen for download progress updates
    useEffect(() => {
        const unsubProgress = window.ipcRenderer.onDownloadProgress((data) => {
            console.log('Download progress:', data);
            setDownloadProgress(data.progress || 0);
            setDownloadSpeed(data.downloadSpeed || 0);
            setDownloadStatus(data.status || 'active');
        });

        const unsubComplete = window.ipcRenderer.onDownloadComplete((data) => {
            console.log('Download complete:', data);
            setDownloadStatus('complete');
            setVideoFilePath(data.filePath);
            setIsLoading(false);

            // Automatically play with MPV when download completes
            if (data.filePath) {
                window.ipcRenderer.playWithMpv(data.filePath);
            }
        });

        const unsubError = window.ipcRenderer.onDownloadError((data) => {
            console.error('Download error:', data);
            setError(data.error || 'Download failed');
            setIsLoading(false);
            setDownloadStatus('error');
        });

        return () => {
            unsubProgress();
            unsubComplete();
            unsubError();
        };
    }, []);

    // Listen for video source changes
    useEffect(() => {
        const handleVideoSrcChange = async (event: CustomEvent<{ type: string, src: string }>) => {
            const { type, src } = event.detail;
            console.log('Video source changed:', type, src);

            if (type === 'magnet') {
                setIsLoading(true);
                setError(null);
                setDownloadStatus('starting');
                setDownloadProgress(0);
                setVideoFilePath(null);

                try {
                    console.log('Starting download with aria2...');
                    const result = await window.ipcRenderer.startStream(src);
                    console.log('Download started:', result);
                    setDownloadGid(result.gid);
                    setDownloadStatus('active');
                } catch (err: any) {
                    console.error('Error starting download:', err);
                    setError(err.message || 'Failed to start download');
                    setIsLoading(false);
                    setDownloadStatus('error');
                }
            } else if (type === 'url') {
                // Direct URL playback
                setVideoFilePath(src);
                await window.ipcRenderer.playWithMpv(src);
            }
        };

        window.addEventListener('video-src-change' as any, handleVideoSrcChange);

        return () => {
            window.removeEventListener('video-src-change' as any, handleVideoSrcChange);
        };
    }, []);

    const handleLaunchMpv = () => {
        if (videoFilePath) {
            window.ipcRenderer.playWithMpv(videoFilePath);
        }
    };

    const formatSpeed = (bytesPerSecond: number): string => {
        if (bytesPerSecond === 0) return '0 B/s';
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
        return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-xl flex flex-col items-center justify-center text-white p-8 text-center">
                {isLoading || downloadStatus === 'active' || downloadStatus === 'starting' ? (
                    <div className="w-full">
                        <div className="text-2xl font-bold mb-4">
                            {downloadStatus === 'starting' ? 'Starting Download...' : 'Downloading...'}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
                            <div
                                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                                style={{ width: `${downloadProgress * 100}%` }}
                            />
                        </div>
                        <div className="text-gray-300 space-y-2">
                            <div>Progress: {(downloadProgress * 100).toFixed(1)}%</div>
                            <div>Speed: {formatSpeed(downloadSpeed)}</div>
                            {downloadGid && <div className="text-sm text-gray-500">GID: {downloadGid}</div>}
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-red-500">
                        <div className="text-xl font-bold mb-2">Error</div>
                        <div>{error}</div>
                    </div>
                ) : videoFilePath ? (
                    <div>
                        <div className="text-3xl font-bold mb-4 text-green-500">✓ Download Complete</div>
                        <p className="mb-6 text-gray-300">The video has been downloaded and launched in MPV player.</p>
                        <p className="text-sm text-gray-500 mb-6 break-all">File: {videoFilePath}</p>
                        <button
                            onClick={handleLaunchMpv}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                        >
                            Play in MPV
                        </button>
                    </div>
                ) : (
                    <div className="text-gray-500">
                        Select a movie to start downloading
                    </div>
                )}
            </div>
        </div>
    );
};
