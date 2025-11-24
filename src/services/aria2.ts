/**
 * Aria2 RPC Client
 * Handles communication with aria2 download manager via JSON-RPC
 */

export interface Aria2Config {
    url: string;
    secret?: string;
}

export interface DownloadStatus {
    gid: string;
    status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';
    totalLength: number;
    completedLength: number;
    downloadSpeed: number;
    uploadSpeed: number;
    connections: number;
    files: Array<{
        path: string;
        length: number;
        completedLength: number;
        selected: string;
    }>;
    errorMessage?: string;
}

export class Aria2Client {
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
        const id = `antigravity-${++this.idCounter}`;

        // Add secret token if configured
        const finalParams = this.secret
            ? [`token:${this.secret}`, ...params]
            : params;

        const payload = {
            jsonrpc: '2.0',
            id,
            method,
            params: finalParams
        };

        console.log('Aria2 RPC Call:', method, params);

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
     * Add a new download from URI (magnet link, torrent file, http, etc.)
     */
    async addUri(uri: string, options?: Record<string, string>): Promise<string> {
        const params = options ? [[uri], options] : [[uri]];
        const gid = await this.call('aria2.addUri', params);
        console.log('Download added with GID:', gid);
        return gid;
    }

    /**
     * Add a torrent download from magnet URI
     */
    async addMagnet(magnetUri: string, options?: Record<string, string>): Promise<string> {
        return this.addUri(magnetUri, options);
    }

    /**
     * Get status of a download
     */
    async tellStatus(gid: string, keys?: string[]): Promise<DownloadStatus> {
        const params = keys ? [gid, keys] : [gid];
        const result = await this.call('aria2.tellStatus', params);
        return this.parseStatus(result);
    }

    /**
     * Get status of all active downloads
     */
    async tellActive(keys?: string[]): Promise<DownloadStatus[]> {
        const params = keys ? [keys] : [];
        const results = await this.call('aria2.tellActive', params);
        return results.map((r: any) => this.parseStatus(r));
    }

    /**
     * Remove a download
     */
    async remove(gid: string): Promise<string> {
        return this.call('aria2.remove', [gid]);
    }

    /**
     * Force remove a download
     */
    async forceRemove(gid: string): Promise<string> {
        return this.call('aria2.forceRemove', [gid]);
    }

    /**
     * Pause a download
     */
    async pause(gid: string): Promise<string> {
        return this.call('aria2.pause', [gid]);
    }

    /**
     * Unpause a download
     */
    async unpause(gid: string): Promise<string> {
        return this.call('aria2.unpause', [gid]);
    }

    /**
     * Get global statistics
     */
    async getGlobalStat(): Promise<any> {
        return this.call('aria2.getGlobalStat');
    }

    /**
     * Parse aria2 status response to our format
     */
    private parseStatus(raw: any): DownloadStatus {
        return {
            gid: raw.gid,
            status: raw.status,
            totalLength: parseInt(raw.totalLength || '0'),
            completedLength: parseInt(raw.completedLength || '0'),
            downloadSpeed: parseInt(raw.downloadSpeed || '0'),
            uploadSpeed: parseInt(raw.uploadSpeed || '0'),
            connections: parseInt(raw.connections || '0'),
            files: raw.files || [],
            errorMessage: raw.errorMessage
        };
    }

    /**
     * Get the first video file from download
     */
    getVideoFile(status: DownloadStatus): string | null {
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];

        for (const file of status.files) {
            const ext = file.path.toLowerCase().slice(file.path.lastIndexOf('.'));
            if (videoExtensions.includes(ext)) {
                return file.path;
            }
        }

        return null;
    }

    /**
     * Calculate download progress (0-1)
     */
    getProgress(status: DownloadStatus): number {
        if (status.totalLength === 0) return 0;
        return status.completedLength / status.totalLength;
    }
}

/**
 * Create a default aria2 client instance
 */
export function createAria2Client(config?: Partial<Aria2Config>): Aria2Client {
    const defaultConfig: Aria2Config = {
        url: 'http://192.168.1.26:6800/jsonrpc',
        ...config
    };

    return new Aria2Client(defaultConfig);
}
