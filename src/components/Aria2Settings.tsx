import React, { useState, useEffect } from 'react';
import { Aria2ConnectionTest } from './Aria2ConnectionTest';

export const Aria2Settings: React.FC = () => {
    const [config, setConfig] = useState({
        url: 'http://192.168.1.26:6800/jsonrpc',
        secret: '',
        downloadDir: ''
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const currentConfig = await window.ipcRenderer.getAria2Config();
            setConfig(currentConfig);
        } catch (error) {
            console.error('Failed to load aria2 config:', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');

        try {
            await window.ipcRenderer.updateAria2Config(config);
            setSaveMessage('✓ Settings saved successfully');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error: any) {
            setSaveMessage(`✗ Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition-colors"
            >
                <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-semibold">Aria2 Settings</span>
                </div>
                <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            Aria2 RPC URL
                        </label>
                        <input
                            type="text"
                            value={config.url}
                            onChange={(e) => setConfig({ ...config, url: e.target.value })}
                            placeholder="http://localhost:6800/jsonrpc"
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            The JSON-RPC endpoint of your aria2 server
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            RPC Secret (Optional)
                        </label>
                        <input
                            type="password"
                            value={config.secret}
                            onChange={(e) => setConfig({ ...config, secret: e.target.value })}
                            placeholder="Leave empty if no secret is set"
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Your aria2 RPC secret token (if configured)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">
                            Download Directory (Optional)
                        </label>
                        <input
                            type="text"
                            value={config.downloadDir}
                            onChange={(e) => setConfig({ ...config, downloadDir: e.target.value })}
                            placeholder="Leave empty to use aria2's default"
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-blue-500 outline-none text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Override aria2's default download directory
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold transition-colors"
                        >
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>

                        {saveMessage && (
                            <span className={`text-sm ${saveMessage.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                                {saveMessage}
                            </span>
                        )}
                    </div>

                    <Aria2ConnectionTest />

                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded">
                        <p className="text-sm text-blue-300">
                            <strong>Note:</strong> Make sure your aria2 server is running before starting downloads.
                            You can start aria2 with: <code className="bg-gray-900 px-2 py-1 rounded">aria2c --enable-rpc</code>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
