import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

// Define ipcRenderer type for TypeScript
declare global {
    interface Window {
        ipcRenderer: {
            startStream: (magnetUri: string) => Promise<string>;
            playWithMpv: (url: string) => Promise<void>;
            onDownloadProgress: (callback: (data: any) => void) => () => void;
        };
    }
}

export const ContentSelector: React.FC = () => {
    const { movies, requestMovie, movieMagnet } = useSocket();
    const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
    const [downloadState, setDownloadState] = useState<{ [key: string]: any }>({});
    const [activeTab, setActiveTab] = useState<'library' | 'downloads'>('library');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Listen for download progress from Electron
        const removeListener = window.ipcRenderer.onDownloadProgress((data: any) => {
            setDownloadState(prev => {
                // Find which movie this infoHash belongs to (if we have it in state)
                // or just update the entry if it exists
                // Check if we already have an entry for this infoHash or ID
                const existingEntryKey = Object.keys(prev).find(key =>
                    prev[key].infoHash === data.infoHash || prev[key].id === data.infoHash
                );

                if (existingEntryKey) {
                    return {
                        ...prev,
                        [existingEntryKey]: { ...prev[existingEntryKey], ...data }
                    };
                }

                // If it's a new one we don't know about yet, add it by infoHash
                return {
                    ...prev,
                    [data.infoHash]: data
                };
            });
        });

        return () => {
            removeListener();
        };
    }, []);

    useEffect(() => {
        if (movieMagnet && movieMagnet.itemId === selectedMovieId) {
            // Find movie name
            const movie = movies.find(m => m.Id === movieMagnet.itemId);
            startDownload(movieMagnet.magnet, movieMagnet.itemId, movie?.Name || 'Unknown Movie');
        }
    }, [movieMagnet, selectedMovieId, movies]);

    const handleSelectMovie = (itemId: string) => {
        // Check if already downloading
        if (downloadState[itemId]) {
            setActiveTab('downloads');
            return;
        }
        setSelectedMovieId(itemId);
        requestMovie(itemId);
    };

    const extractInfoHash = (magnetUri: string): string | null => {
        const match = magnetUri.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
        return match ? match[1].toLowerCase() : null;
    };

    const startDownload = async (magnet: string, itemId: string, movieName: string) => {
        try {
            console.log('Starting download for:', itemId);
            const infoHash = extractInfoHash(magnet);

            // Initialize state for this movie immediately with infoHash
            setDownloadState(prev => ({
                ...prev,
                [itemId]: {
                    id: itemId,
                    infoHash: infoHash, // Store infoHash immediately to prevent duplicates
                    name: movieName,
                    progress: 0,
                    ready: false,
                    status: 'Initializing...',
                    streamUrl: null
                }
            }));

            // Switch to downloads tab
            setActiveTab('downloads');

            const streamUrl = await window.ipcRenderer.startStream(magnet);

            setDownloadState(prev => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    streamUrl: streamUrl,
                    status: 'Downloading'
                }
            }));

        } catch (error) {
            console.error('Error starting download:', error);
            setDownloadState(prev => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    status: 'Error'
                }
            }));
        }
    };

    const handlePlay = async (streamUrl: string) => {
        if (!streamUrl) return;
        console.log('Launching MPV for:', streamUrl);
        try {
            await window.ipcRenderer.playWithMpv(streamUrl);
        } catch (error) {
            console.error('Failed to launch MPV:', error);
        }
    };

    const filteredMovies = movies.filter(movie =>
        movie.Name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeDownloads = Object.values(downloadState);

    return (
        <div className="p-4 border rounded-lg shadow-md bg-gray-800 text-white flex flex-col h-[600px]">
            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-4 items-center">
                <button
                    className={`flex-1 py-2 font-bold ${activeTab === 'library' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('library')}
                >
                    Library
                </button>
                <button
                    className={`flex-1 py-2 font-bold ${activeTab === 'downloads' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => setActiveTab('downloads')}
                >
                    Downloads ({activeDownloads.length})
                </button>
                {activeTab === 'downloads' && activeDownloads.length > 0 && (
                    <button
                        onClick={() => setDownloadState({})}
                        className="px-3 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 rounded ml-2 mr-2 transition-colors"
                    >
                        Clear List
                    </button>
                )}
            </div>

            {/* Library View */}
            {activeTab === 'library' && (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Search Bar */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search movies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none text-white"
                        />
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {filteredMovies.length === 0 ? (
                            <p className="text-gray-400 italic text-center mt-10">No movies found.</p>
                        ) : (
                            <ul className="space-y-2">
                                {filteredMovies.map((movie) => {
                                    const isDownloading = !!downloadState[movie.Id];
                                    return (
                                        <li key={movie.Id} className="flex items-center justify-between bg-gray-700 p-3 rounded hover:bg-gray-600 transition-colors">
                                            <div className="flex flex-col overflow-hidden mr-2">
                                                <span className="font-medium truncate" title={movie.Name}>{movie.Name}</span>
                                                {movie.Year && <span className="text-xs text-gray-400">{movie.Year}</span>}
                                            </div>
                                            <button
                                                onClick={() => handleSelectMovie(movie.Id)}
                                                disabled={selectedMovieId === movie.Id && !isDownloading}
                                                className={`px-3 py-1 rounded text-sm whitespace-nowrap ${isDownloading
                                                    ? 'bg-green-600 hover:bg-green-700'
                                                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500'
                                                    }`}
                                            >
                                                {selectedMovieId === movie.Id && !isDownloading ? 'Requesting...' : (isDownloading ? 'Go to Downloads' : 'Download')}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Downloads View */}
            {activeTab === 'downloads' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeDownloads.length === 0 ? (
                        <p className="text-gray-400 italic text-center mt-10">No active downloads.</p>
                    ) : (
                        <ul className="space-y-4">
                            {activeDownloads.map((download: any) => {
                                const currentProgress = Math.round((download.progress || 0) * 100);
                                const progress = Math.max(currentProgress, download.lastProgress || 0);
                                download.lastProgress = progress;

                                const isReady = download.ready || progress === 100;

                                return (
                                    <li key={download.id || download.infoHash} className="bg-gray-700 p-4 rounded shadow-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-lg">{download.name || 'Unknown Movie'}</h3>
                                                <div className="text-xs text-gray-400 flex gap-4 mt-1">
                                                    <span>Status: <span className="text-blue-300">
                                                        {isReady ? 'Ready to Play' : (download.status || 'Downloading...')}
                                                    </span></span>
                                                    <span>Peers: {download.numPeers || 0}</span>
                                                    <span>Speed: {(!download.downloadSpeed || isNaN(download.downloadSpeed)) ? '0.00' : (download.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
                                                </div>
                                            </div>
                                            {isReady && (
                                                <button
                                                    onClick={() => handlePlay(download.streamUrl)}
                                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold shadow-md transform hover:scale-105 transition-all"
                                                >
                                                    Play Now
                                                </button>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-gray-900 rounded-full h-4 mt-2 relative overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                                                style={{ width: `${progress}%` }}
                                            >
                                            </div>
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
                                                {progress}%
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div >
    );
};
