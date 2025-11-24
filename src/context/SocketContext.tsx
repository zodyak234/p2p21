import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
    id: string;
    username: string;
    socketId: string;
}

export interface JellyfinMovie {
    Id: string;
    Name: string;
    Year?: number;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    user: User | null;
    onlineUsers: User[];
    movies: JellyfinMovie[];
    peerId: string | null;
    movieMagnet: { itemId: string, magnet: string } | null;
    connectionError: string | null;
    connect: (url: string) => void;
    login: (username: string, password?: string) => void;
    register: (username: string, password?: string) => void;
    requestMovie: (itemId: string) => void;
    sendSyncEvent: (type: string, time: number) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [movies, setMovies] = useState<JellyfinMovie[]>([]);
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [movieMagnet, setMovieMagnet] = useState<{ itemId: string, magnet: string } | null>(null);

    useEffect(() => {
        const savedUrl = localStorage.getItem('p2p_server_url');
        if (savedUrl) {
            connect(savedUrl);
        }
    }, []);

    const connect = (url: string) => {
        if (socket) {
            socket.disconnect();
        }

        const newSocket = io(url);

        newSocket.on('connect', () => {
            console.log('Connected to server:', url);
            setIsConnected(true);
            setConnectionError(null);
            localStorage.setItem('p2p_server_url', url);
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setIsConnected(false);
            setConnectionError(err.message);
        });

        newSocket.on('auth-error', (msg) => {
            alert(msg); // Simple alert for now
        });

        newSocket.on('register-success', () => {
            alert('Registration successful! Please login.');
        });

        newSocket.on('login-success', ({ user, peerId }: { user: User, peerId: string }) => {
            console.log('Login successful:', user);
            setUser(user);
            setPeerId(peerId);
            localStorage.setItem('p2p_peer_id', peerId); // Persist Peer ID
        });

        newSocket.on('user-list', (users: User[]) => {
            setOnlineUsers(users);
        });

        newSocket.on('movie-list', (movies: JellyfinMovie[]) => {
            setMovies(movies);
        });

        newSocket.on('movie-magnet', ({ itemId, magnet }: { itemId: string, magnet: string }) => {
            console.log('Received magnet for movie:', itemId);
            setMovieMagnet({ itemId, magnet });
            // Dispatch event for VideoPlayer (legacy/backup)
            window.dispatchEvent(new CustomEvent('video-src-change', {
                detail: { type: 'magnet', src: magnet }
            }));
        });

        newSocket.on('sync-event', (data: any) => {
            window.dispatchEvent(new CustomEvent('p2p-sync-event', { detail: data }));
        });

        setSocket(newSocket);
    };

    const login = (username: string, password?: string) => {
        if (socket) {
            socket.emit('login', { username, password });
        }
    };

    const register = (username: string, password?: string) => {
        if (socket) {
            socket.emit('register', { username, password });
        }
    };

    const requestMovie = (itemId: string) => {
        if (socket) {
            socket.emit('request-movie', itemId);
        }
    };

    const sendSyncEvent = (type: string, time: number) => {
        if (socket) {
            socket.emit('sync-event', { type, time, timestamp: Date.now() });
        }
    };

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            user,
            onlineUsers,
            movies,
            peerId,
            movieMagnet,
            connectionError,
            connect,
            login,
            register,
            requestMovie,
            sendSyncEvent
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
