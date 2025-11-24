export interface JellyfinItem {
    Name: string;
    Id: string;
    Type: string;
}

export class JellyfinService {
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async search(query: string): Promise<JellyfinItem[]> {
        try {
            const url = `${this.baseUrl}/Items?SearchTerm=${encodeURIComponent(query)}&IncludeItemTypes=Movie&Recursive=true&api_key=${this.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Jellyfin API Error: ${response.statusText}`);
            }
            const data = await response.json();
            return data.Items || [];
        } catch (error) {
            console.error('Jellyfin search failed:', error);
            return [];
        }
    }

    getStreamUrl(itemId: string): string {
        return `${this.baseUrl}/Videos/${itemId}/stream?static=true&api_key=${this.apiKey}`;
    }
}
