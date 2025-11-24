import React, { createContext, useContext, useEffect, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';

interface P2PContextType {
    peerId: string | null;
    connections: DataConnection[];
    initializePeer: (username: string) => void;
    connectToPeer: (peerId: string) => void;
    sendMessage: (data: any) => void;
    lastMessage: any;
    isInitialized: boolean;
    shareChunk: (chunkData: ArrayBuffer, chunkIndex: number, totalChunks: number) => void;
    requestChunk: (peerId: string, chunkIndex: number) => void;
    onChunkReceived: (callback: (data: any) => void) => void;
}

const P2PContext = createContext<P2PContextType | null>(null);

export const P2PProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [chunkCallbacks, setChunkCallbacks] = useState<((data: any) => void)[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            peer?.destroy();
        };
    }, [peer]);

    const initializePeer = (username: string) => {
        if (peer) return;

        // Clean username to be URL safe for PeerJS
        const cleanId = username.replace(/[^a-zA-Z0-9_-]/g, '');

        const newPeer = new Peer(cleanId, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        newPeer.on('open', (id) => {
            setPeerId(id);
            setIsInitialized(true);
            console.log('🔗 P2P initialized. My peer ID:', id);
        });

        newPeer.on('connection', (conn) => {
            console.log('📥 Incoming P2P connection from:', conn.peer);
            setupConnection(conn);
        });

        newPeer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            if (err.type !== 'peer-unavailable') {
                alert(`P2P Error: ${err.type}`);
            }
        });

        setPeer(newPeer);
    };

    const setupConnection = (conn: DataConnection) => {
        conn.on('open', () => {
            setConnections((prev) => {
                if (prev.find(c => c.peer === conn.peer)) return prev;
                console.log('✅ P2P connection established with:', conn.peer);
                return [...prev, conn];
            });
        });

        conn.on('data', (data: any) => {
            console.log('📦 Received P2P data from:', conn.peer);

            // Handle different message types
            if (data.type === 'chunk') {
                // File chunk received
                console.log(`📥 Chunk ${data.chunkIndex}/${data.totalChunks} received`);
                chunkCallbacks.forEach(cb => cb(data));
            } else if (data.type === 'chunk-request') {
                // Someone is requesting a chunk
                console.log(`📤 Chunk ${data.chunkIndex} requested by ${conn.peer}`);
            } else {
                // Regular message
                setLastMessage(data);
            }
        });

        conn.on('close', () => {
            setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
            console.log('🔌 P2P connection closed:', conn.peer);
        });

        conn.on('error', (err) => {
            console.error('❌ P2P connection error:', err);
        });
    };

    const connectToPeer = (targetPeerId: string) => {
        if (!peer) {
            console.warn('⚠️ Peer not initialized');
            return;
        }

        // Check if already connected
        if (connections.find(c => c.peer === targetPeerId)) {
            console.log('ℹ️ Already connected to:', targetPeerId);
            return;
        }

        console.log('🔗 Connecting to peer:', targetPeerId);
        const conn = peer.connect(targetPeerId, {
            reliable: true,
            serialization: 'binary'
        });
        setupConnection(conn);
    };

    const sendMessage = (data: any) => {
        connections.forEach((conn) => {
            if (conn.open) {
                conn.send(data);
            }
        });
    };

    // Share a file chunk with all connected peers
    const shareChunk = (chunkData: ArrayBuffer, chunkIndex: number, totalChunks: number) => {
        const message = {
            type: 'chunk',
            chunkIndex,
            totalChunks,
            data: chunkData
        };

        connections.forEach((conn) => {
            if (conn.open) {
                try {
                    conn.send(message);
                    console.log(`📤 Sent chunk ${chunkIndex}/${totalChunks} to ${conn.peer}`);
                } catch (error) {
                    console.error('Error sending chunk:', error);
                }
            }
        });
    };

    // Request a specific chunk from a peer
    const requestChunk = (targetPeerId: string, chunkIndex: number) => {
        const conn = connections.find(c => c.peer === targetPeerId);
        if (conn && conn.open) {
            conn.send({
                type: 'chunk-request',
                chunkIndex
            });
            console.log(`📥 Requested chunk ${chunkIndex} from ${targetPeerId}`);
        }
    };

    // Register callback for chunk received events
    const onChunkReceived = (callback: (data: any) => void) => {
        setChunkCallbacks(prev => [...prev, callback]);
    };

    return (
        <P2PContext.Provider value={{
            peerId,
            connections,
            initializePeer,
            connectToPeer,
            sendMessage,
            lastMessage,
            isInitialized,
            shareChunk,
            requestChunk,
            onChunkReceived
        }}>
            {children}
        </P2PContext.Provider>
    );
};

export const useP2P = () => {
    const context = useContext(P2PContext);
    if (!context) {
        throw new Error('useP2P must be used within a P2PProvider');
    }
    return context;
};
