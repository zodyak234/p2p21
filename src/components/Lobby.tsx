import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const Lobby: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const { connect, login, register, isConnected, user, onlineUsers, connectionError } = useSocket();

    useEffect(() => {
        const savedUrl = localStorage.getItem('p2p_server_url');
        if (savedUrl) setServerUrl(savedUrl);
    }, []);

    const handleConnect = () => {
        if (serverUrl) connect(serverUrl);
    };

    const handleAuth = () => {
        if (username && password) {
            if (isRegistering) {
                register(username, password);
            } else {
                login(username, password);
            }
        } else {
            alert('Please enter username and password');
        }
    };

    if (user) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-4 text-green-400">Connected as {user.username}</h2>
                <h3 className="text-lg font-semibold mb-2">Online Users:</h3>
                <ul className="space-y-2">
                    {onlineUsers.map(u => (
                        <li key={u.id} className="flex items-center space-x-2 bg-gray-700 p-2 rounded">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{u.username} {u.id === user.id ? '(You)' : ''}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center">
                {isConnected ? (isRegistering ? 'Register' : 'Login') : 'Connect to Server'}
            </h2>

            {/* Server Connection Section */}
            {!isConnected && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Server URL</label>
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="http://localhost:3000"
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
                        />
                    </div>
                    {connectionError && (
                        <div className="text-red-500 text-sm bg-red-900/20 p-2 rounded">
                            Error: {connectionError}
                        </div>
                    )}
                    <button
                        onClick={handleConnect}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                    >
                        Connect
                    </button>
                </div>
            )}

            {/* Auth Section */}
            {isConnected && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <button
                        onClick={handleAuth}
                        className={`w-full font-bold py-2 px-4 rounded transition ${isRegistering
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isRegistering ? 'Register' : 'Login'}
                    </button>

                    <div className="text-center text-sm text-gray-400 mt-4">
                        {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-blue-400 hover:underline"
                        >
                            {isRegistering ? 'Login here' : 'Register here'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
