export interface RadarrMovie {
    title: string;
    id: number;
    hasFile: boolean;
}

export class RadarrService {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async search(query: string): Promise<RadarrMovie[]> {
        try {
            const url = `${this.baseUrl}/api/v3/movie/lookup?term=${encodeURIComponent(query)}&apikey=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Radarr API Error: ${response.statusText}`);
            }
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Radarr search failed:', error);
            return [];
        }
    }
}
