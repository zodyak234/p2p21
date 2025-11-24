/**
 * Aria2 RPC Client for Server
 * Manages file sharing via aria2 on the server side
 */

export interface Aria2Config {
    url: string;
    secret?: string;
}

export interface DownloadInfo {
    gid: string;
    status: string;
    totalLength: number;
    completedLength: number;
    downloadSpeed: number;
    files: Array<{
        path: string;
        length: number;
        uris: Array<{ uri: string }>;
    }>;
}

export class Aria2ServerClient {
    private url: string;
    private secret?: string;
    private idCounter = 0;

    constructor(config: Aria2Config) {
        this.url = config.url;
        this.secret = config.secret;
    }

    /**
     * Make a JSON-RPC call to aria2
     */
    private async call(method: string, params: any[] = []): Promise<any> {
        const id = `server-${++this.idCounter}`;

        const finalParams = this.secret
            ? [`token:${this.secret}`, ...params]
            : params;

        const payload = {
            jsonrpc: '2.0',
            id,
            method,
            params: finalParams
        };

        console.log('Aria2 Server RPC Call:', method);

        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Aria2 RPC failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`Aria2 Error: ${data.error.message} (Code: ${data.error.code})`);
        }

        return data.result;
    }

    /**
     * Add a file to be shared via HTTP
     * This creates a torrent/magnet link that clients can download from
     */
    async shareFile(filePath: string, options?: Record<string, string>): Promise<string> {
        // For aria2, we'll use addUri with file:// protocol
        // This will make the file available for download
        const fileUri = `file://${filePath}`;

        const defaultOptions = {
            'seed-time': '0', // Seed indefinitely
            'bt-seed-unverified': 'true',
            ...options
        };

        const params = [[fileUri], defaultOptions];
        const gid = await this.call('aria2.addUri', params);
        console.log('File shared with GID:', gid);
        return gid;
    }

    /**
     * Add torrent from file path and seed it
     */
    async addTorrent(torrentPath: string, options?: Record<string, string>): Promise<string> {
        const defaultOptions = {
            'seed-ratio': '0.0', // Seed indefinitely
            ...options
        };

        const gid = await this.call('aria2.addTorrent', [torrentPath, [], defaultOptions]);
        console.log('Torrent added with GID:', gid);
        return gid;
    }

    /**
     * Get download/upload status
     */
    async getStatus(gid: string): Promise<DownloadInfo> {
        const result = await this.call('aria2.tellStatus', [gid]);
        return result;
    }

    /**
     * Get all active downloads/uploads
     */
    async getActive(): Promise<DownloadInfo[]> {
        const results = await this.call('aria2.tellActive');
        return results;
    }

    /**
     * Remove a download/upload
     */
    async remove(gid: string): Promise<string> {
        return this.call('aria2.remove', [gid]);
    }

    /**
     * Get aria2 version (for testing connection)
     */
    async getVersion(): Promise<any> {
        return this.call('aria2.getVersion');
    }

    /**
     * Get global statistics
     */
    async getGlobalStat(): Promise<any> {
        return this.call('aria2.getGlobalStat');
    }
}

/**
 * Create aria2 client for server
 */
export function createAria2ServerClient(config?: Partial<Aria2Config>): Aria2ServerClient {
    const defaultConfig: Aria2Config = {
        url: 'http://localhost:6800/jsonrpc',
        ...config
    };

    return new Aria2ServerClient(defaultConfig);
}
