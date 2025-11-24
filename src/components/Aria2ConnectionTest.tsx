import React, { useState } from 'react';

export const Aria2ConnectionTest: React.FC = () => {
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const testConnection = async () => {
        setIsTestingConnection(true);
        setConnectionStatus('idle');
        setErrorMessage('');

        try {
            const config = await window.ipcRenderer.getAria2Config();
            console.log('Testing connection to:', config.url);

            // Try to get aria2 version to test connection
            const response = await fetch(config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'test',
                    method: 'aria2.getVersion',
                    params: config.secret ? [`token:${config.secret}`] : []
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            setConnectionStatus('success');
            console.log('Aria2 version:', data.result);
        } catch (error: any) {
            setConnectionStatus('error');
            setErrorMessage(error.message || 'Connection failed');
            console.error('Connection test failed:', error);
        } finally {
            setIsTestingConnection(false);
        }
    };

    return (
        <div className="mt-4 p-3 bg-gray-700/50 rounded border border-gray-600">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Connection Test</span>
                <button
                    onClick={testConnection}
                    disabled={isTestingConnection}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm font-semibold transition-colors"
                >
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
            </div>

            {connectionStatus === 'success' && (
                <div className="mt-2 p-2 bg-green-900/30 border border-green-700/50 rounded text-sm text-green-300">
                    ✓ Successfully connected to aria2 server!
                </div>
            )}

            {connectionStatus === 'error' && (
                <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-300">
                    ✗ Connection failed: {errorMessage}
                </div>
            )}
        </div>
    );
};
