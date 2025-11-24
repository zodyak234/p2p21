/**
 * Simple BitTorrent Tracker for Private P2P Network
 * Tracks peers and helps them find each other
 */

interface Peer {
    peerId: string;
    ip: string;
    port: number;
    lastSeen: number;
}

interface Torrent {
    infoHash: string;
    peers: Map<string, Peer>;
}

export class SimpleTracker {
    private torrents: Map<string, Torrent> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup old peers every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * Announce - Peer announces itself for a torrent
     */
    announce(infoHash: string, peerId: string, ip: string, port: number): Peer[] {
        // Get or create torrent
        let torrent = this.torrents.get(infoHash);
        if (!torrent) {
            torrent = {
                infoHash,
                peers: new Map()
            };
            this.torrents.set(infoHash, torrent);
        }

        // Add/update peer
        torrent.peers.set(peerId, {
            peerId,
            ip,
            port,
            lastSeen: Date.now()
        });

        console.log(`📡 Tracker: Peer ${peerId} announced for ${infoHash.substring(0, 8)}...`);
        console.log(`   Total peers for this torrent: ${torrent.peers.size}`);

        // Return list of other peers (excluding this one)
        const peerList: Peer[] = [];
        torrent.peers.forEach((peer, id) => {
            if (id !== peerId) {
                peerList.push(peer);
            }
        });

        return peerList;
    }

    /**
     * Scrape - Get statistics about torrents
     */
    scrape(infoHashes?: string[]): Map<string, { complete: number; incomplete: number }> {
        const stats = new Map<string, { complete: number; incomplete: number }>();

        const hashesToScrape = infoHashes || Array.from(this.torrents.keys());

        hashesToScrape.forEach(hash => {
            const torrent = this.torrents.get(hash);
            if (torrent) {
                stats.set(hash, {
                    complete: torrent.peers.size, // All peers are seeders in our case
                    incomplete: 0
                });
            }
        });

        return stats;
    }

    /**
     * Remove a peer from a torrent
     */
    removePeer(infoHash: string, peerId: string): void {
        const torrent = this.torrents.get(infoHash);
        if (torrent) {
            torrent.peers.delete(peerId);
            console.log(`🔌 Tracker: Peer ${peerId} removed from ${infoHash.substring(0, 8)}...`);

            // Remove torrent if no peers left
            if (torrent.peers.size === 0) {
                this.torrents.delete(infoHash);
                console.log(`🗑️  Tracker: Torrent ${infoHash.substring(0, 8)}... removed (no peers)`);
            }
        }
    }

    /**
     * Cleanup old peers (not seen in 10 minutes)
     */
    private cleanup(): void {
        const now = Date.now();
        const timeout = 10 * 60 * 1000; // 10 minutes

        let removedCount = 0;

        this.torrents.forEach((torrent, hash) => {
            torrent.peers.forEach((peer, peerId) => {
                if (now - peer.lastSeen > timeout) {
                    torrent.peers.delete(peerId);
                    removedCount++;
                }
            });

            // Remove empty torrents
            if (torrent.peers.size === 0) {
                this.torrents.delete(hash);
            }
        });

        if (removedCount > 0) {
            console.log(`🧹 Tracker: Cleaned up ${removedCount} inactive peers`);
        }
    }

    /**
     * Get statistics
     */
    getStats(): { torrents: number; totalPeers: number } {
        let totalPeers = 0;
        this.torrents.forEach(torrent => {
            totalPeers += torrent.peers.size;
        });

        return {
            torrents: this.torrents.size,
            totalPeers
        };
    }

    /**
     * Destroy tracker
     */
    destroy(): void {
        clearInterval(this.cleanupInterval);
    }
}
