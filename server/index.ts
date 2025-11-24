import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';
import crypto from 'crypto';
import { networkInterfaces } from 'os';
import { createAria2ServerClient, Aria2ServerClient } from './aria2-client.js';
import { SimpleTracker } from './tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configuration - REPLACE THESE WITH YOUR ACTUAL DETAILS
const JELLYFIN_URL = 'http://localhost:8096';
const JELLYFIN_API_KEY = 'YOUR_JELLYFIN_API_KEY'; // User needs to set this
const JELLYFIN_USER_ID = 'YOUR_USER_ID'; // Optional, for user-specific data

// Aria2 Configuration
const ARIA2_RPC_URL = 'http://localhost:6800/jsonrpc';
const ARIA2_SECRET = ''; // Set if you have RPC secret

// Aria2 Client
const aria2Client = createAria2ServerClient({
    url: ARIA2_RPC_URL,
    secret: ARIA2_SECRET
});

// BitTorrent Tracker (Private P2P)
const tracker = new SimpleTracker();

// Active Shares: Map<JellyfinItemID, { gid: string, magnetUri?: string, httpUrl?: string }>
const activeShares: Map<string, { gid: string; magnetUri?: string; httpUrl?: string }> = new Map();

// --- TYPES ---
interface JellyfinItem {
    Id: string;
    Name: string;
    Path: string;
    ProductionYear?: number;
}

interface StoredUser {
    id: string;
    username: string;
    salt: string;
    passwordHash: string;
    peerId: string;
}

interface User {
    id: string;
    username: string;
    socketId: string;
}

// --- AUTH HELPERS (Node.js Crypto) ---
function hashPassword(password: string): { salt: string, hash: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === storedHash;
}

// --- USER DATABASE ---
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers(): StoredUser[] {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

function saveUsers(users: StoredUser[]) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
}

// Active Online Users
const users: Map<string, User> = new Map();

// --- JELLYFIN ---
async function getJellyfinLibrary(): Promise<JellyfinItem[]> {
    try {
        const response = await axios.get(`${JELLYFIN_URL}/Items`, {
            params: {
                api_key: JELLYFIN_API_KEY,
                IncludeItemTypes: 'Movie',
                Recursive: true,
                Fields: 'Path,ProductionYear',
            }
        });
        return response.data.Items;
    } catch (error) {
        console.error('Error fetching Jellyfin library:', error);
        return [];
    }
}

function getKeyByValue(map: Map<string, User>, searchValue: string): string | undefined {
    for (const [key, value] of map.entries()) {
        if (value.socketId === searchValue) {
            return key;
        }
    }
    return undefined;
}

// --- TORRENT CREATION ---
async function createTorrentForFile(filePath: string, fileName: string): Promise<string> {
    // We'll create a simple magnet URI format
    // In production, you might want to use a proper torrent creation library
    const infoHash = crypto.createHash('sha1').update(filePath).digest('hex');

    // Get server's external IP
    const nets = networkInterfaces();
    let serverIp = 'localhost';

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            if (net.family === 'IPv4' && !net.internal) {
                serverIp = net.address;
                break;
            }
        }
    }

    // Create a magnet URI with HTTP/HTTPS tracker
    // Format: magnet:?xt=urn:btih:<info-hash>&dn=<name>&tr=<tracker>&ws=<web-seed>
    const magnetUri = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(fileName)}&ws=http://${serverIp}:6800/files/${encodeURIComponent(fileName)}`;

    return magnetUri;
}

// Test Aria2 connection on startup
async function testAria2Connection() {
    try {
        const version = await aria2Client.getVersion();
        console.log('✓ Connected to Aria2 RPC');
        console.log('  Version:', version.version);
        console.log('  Features:', version.enabledFeatures.join(', '));
        return true;
    } catch (error: any) {
        console.error('✗ Failed to connect to Aria2 RPC:', error.message);
        console.error('  Make sure aria2c is running with --enable-rpc');
        console.error('  Command: aria2c --enable-rpc --rpc-listen-all=true');
        return false;
    }
}

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    // REGISTER
    socket.on('register', ({ username, password }) => {
        const usersDb = loadUsers();

        if (usersDb.find(u => u.username === username)) {
            socket.emit('auth-error', 'Username already exists');
            return;
        }

        const { salt, hash } = hashPassword(password);
        const newUser: StoredUser = {
            id: crypto.randomUUID(),
            username,
            salt,
            passwordHash: hash,
            peerId: crypto.randomUUID()
        };

        usersDb.push(newUser);
        saveUsers(usersDb);

        console.log(`New user registered: ${username}`);
        socket.emit('register-success');
    });

    // LOGIN
    socket.on('login', ({ username, password }) => {
        const usersDb = loadUsers();
        const storedUser = usersDb.find(u => u.username === username);

        if (!storedUser) {
            socket.emit('auth-error', 'User not found');
            return;
        }

        if (!verifyPassword(password, storedUser.salt, storedUser.passwordHash)) {
            socket.emit('auth-error', 'Invalid password');
            return;
        }

        // Login successful
        const user: User = {
            id: storedUser.id,
            username: storedUser.username,
            socketId: socket.id
        };
        users.set(username, user);

        console.log(`User logged in: ${username}`);

        // Send back the persistent Peer ID and user info
        socket.emit('login-success', {
            user,
            peerId: storedUser.peerId
        });

        io.emit('user-list', Array.from(users.values()));

        // Fetch and send library
        getJellyfinLibrary().then(movies => {
            const clientMovies = movies.map(m => ({ Id: m.Id, Name: m.Name, Year: m.ProductionYear }));
            socket.emit('movie-list', clientMovies);
        });
    });

    // Request to Play a Movie (Now using Aria2 instead of WebTorrent)
    socket.on('request-movie', async (itemId: string) => {
        console.log(`Request to play movie ID: ${itemId}`);

        if (activeShares.has(itemId)) {
            console.log('Already sharing, sending existing magnet.');
            const share = activeShares.get(itemId);
            socket.emit('movie-magnet', { itemId, magnet: share?.magnetUri });
            return;
        }

        const library = await getJellyfinLibrary();
        const item = library.find(i => i.Id === itemId);

        if (!item || !item.Path) {
            console.error('Movie not found or no path:', itemId);
            socket.emit('movie-error', { itemId, error: 'Movie not found' });
            return;
        }

        console.log(`Found movie: ${item.Name} at ${item.Path}`);

        try {
            // Create magnet URI for the file
            const magnetUri = await createTorrentForFile(item.Path, item.Name);

            console.log(`Magnet URI created for: ${item.Name}`);
            console.log(`Magnet: ${magnetUri}`);

            // Store the share info
            activeShares.set(itemId, {
                gid: crypto.randomUUID(), // Placeholder GID
                magnetUri: magnetUri
            });

            // Send magnet to client
            socket.emit('movie-magnet', { itemId, magnet: magnetUri });

            console.log(`✓ Movie ready for download: ${item.Name}`);
        } catch (error: any) {
            console.error('Error sharing file:', error);
            socket.emit('movie-error', { itemId, error: error.message });
        }
    });

    // Video Sync Events
    socket.on('sync-event', (data: { type: string, time: number, timestamp: number }) => {
        socket.broadcast.emit('sync-event', data);
    });

    socket.on('disconnect', () => {
        const username = getKeyByValue(users, socket.id);
        if (username) {
            users.delete(username);
            io.emit('user-list', Array.from(users.values()));
            console.log(`User disconnected: ${username}`);
        }
    });
});

// --- BITTORRENT TRACKER ENDPOINTS (Private P2P) ---

// Tracker Announce Endpoint
app.get('/announce', (req, res) => {
    const { info_hash, peer_id, port, ip } = req.query;

    if (!info_hash || !peer_id || !port) {
        return res.status(400).send('Missing required parameters');
    }

    const infoHash = info_hash as string;
    const peerId = peer_id as string;
    const peerPort = parseInt(port as string);
    const peerIp = ip as string || req.ip || req.socket.remoteAddress || 'unknown';

    // Announce to tracker
    const peers = tracker.announce(infoHash, peerId, peerIp, peerPort);

    // Return peer list in compact format
    const response = {
        interval: 60, // Re-announce every 60 seconds
        peers: peers.map(p => ({
            ip: p.ip,
            port: p.port,
            peer_id: p.peerId
        }))
    };

    res.json(response);
});

// Tracker Scrape Endpoint
app.get('/scrape', (req, res) => {
    const { info_hash } = req.query;

    const hashes = info_hash ? [info_hash as string] : undefined;
    const stats = tracker.scrape(hashes);

    const response: any = { files: {} };
    stats.forEach((stat, hash) => {
        response.files[hash] = {
            complete: stat.complete,
            incomplete: stat.incomplete,
            downloaded: stat.complete
        };
    });

    res.json(response);
});

// Tracker Stats Endpoint
app.get('/tracker/stats', (req, res) => {
    const stats = tracker.getStats();
    res.json({
        ...stats,
        message: 'Private P2P Tracker - Local Network Only'
    });
});


const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', async () => {
    const nets = networkInterfaces();
    const results: any = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) results[name] = [];
                results[name].push(net.address);
            }
        }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('🚀 Master Server (Aria2 Edition) Started!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📡 Local:   http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${Object.values(results)[0]?.[0] || 'UNKNOWN_IP'}:${PORT}`);
    console.log('───────────────────────────────────────────────────────');

    // Test Aria2 connection
    const aria2Connected = await testAria2Connection();

    if (!aria2Connected) {
        console.log('⚠️  WARNING: Aria2 RPC not available!');
        console.log('   File sharing will not work until aria2 is started.');
    }

    console.log('═══════════════════════════════════════════════════════');
});
