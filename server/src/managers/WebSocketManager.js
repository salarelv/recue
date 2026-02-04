const StateManager = require('./StateManager');
const PlaylistManager = require('./PlaylistManager');
const MediaManager = require('./MediaManager');

class WebSocketManager {
    constructor(fastify, oscManager) {
        this.fastify = fastify;
        this.oscManager = oscManager;
        this.clients = new Set();
        this.players = new Set();
        this.managers = new Set();

        this.setupRoutes();
    }

    setupRoutes() {
        this.fastify.register(async (fastify) => {
            fastify.get('/ws', { websocket: true }, (connection, req) => {
                this.handleConnection(connection, req);
            });
        });
    }

    handleConnection(connection, req) {
        // Fastify-websocket v10+ passes (connection, req) where connection is { socket: WebSocket }
        const socket = connection.socket || connection;

        if (!socket) {
            console.error('WebSocket connection invalid:', connection);
            return;
        }

        this.clients.add(socket);
        socket.subscriptions = new Set(); // Track subscriptions for this socket

        console.log('New WebSocket connection');

        socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                await this.handleMessage(socket, data);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        socket.on('close', () => {
            this.handleDisconnect(socket);
        });

        socket.on('error', (err) => {
            console.error('WebSocket error:', err);
            this.handleDisconnect(socket);
        });
    }

    async handleMessage(socket, data) {
        const { type, payload } = data;
        // console.log(`Received message: ${type}`, payload);

        switch (type) {
            case 'session:register':
                this.registerClient(socket, payload.role);
                break;

            case 'subscribe':
                if (payload.channel) {
                    socket.subscriptions.add(payload.channel);
                    console.log(`Client subscribed to ${payload.channel}`);
                }
                break;

            case 'unsubscribe':
                if (payload.channel) {
                    socket.subscriptions.delete(payload.channel);
                    console.log(`Client unsubscribed from ${payload.channel}`);
                }
                break;

            // --- Player Control (Manager -> Player) ---
            case 'command:player':
                this.broadcastToPlayers('control:command', payload);
                break;

            // --- Player Status Updates (Player -> Manager) ---
            case 'player:status':
                StateManager.updatePlayerState(payload);
                const playlistId = payload.playlistId || StateManager.getPlayerState().playlistId || 'default';
                this.broadcastToPlaylist(playlistId, 'player:state', StateManager.getPlayerState());
                break;

            case 'player:ready':
                console.log("Player is ready");
                this.broadcastToPlaylist(payload.playlistId || 'default', 'player:ready', payload);
                break;

            case 'player:time':
                // Broadcast time updates to listeners (manager)
                // console.log('Player time', payload);
                this.broadcastToPlaylist(payload.playlistId || 'default', 'player:time', payload);
                break;

            case 'player:event':
                // Broadcast generic events (ended, etc)
                console.log('Player event', payload);
                this.broadcastToPlaylist(payload.playlistId || 'default', 'player:event', payload);
                break;

            default:
                console.warn(`Unknown message type: ${type}`);
        }
    }

    registerClient(socket, role) {
        if (role === 'player') {
            this.players.add(socket);
            socket.role = 'player';
            console.log('Registered Player');
        } else if (role === 'manager') {
            this.managers.add(socket);
            socket.role = 'manager';
            StateManager.setManagerConnected(true);
            console.log('Registered Manager');
        }
    }

    handleDisconnect(socket) {
        this.clients.delete(socket);
        if (socket.role === 'player') {
            this.players.delete(socket);
            console.log('Player disconnected');
        } else if (socket.role === 'manager') {
            this.managers.delete(socket);
            if (this.managers.size === 0) {
                StateManager.setManagerConnected(false);
            }
            console.log('Manager disconnected');
        }
    }

    send(socket, type, payload) {
        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({ type, payload }));
        }
    }

    broadcastToPlaylist(playlistId, type, payload) {
        const channel = `playlist:${playlistId}`;
        for (const client of this.clients) {
            if (client.subscriptions && client.subscriptions.has(channel)) {
                this.send(client, type, payload);
            }
        }
    }

    broadcastToAllPlaylists(type, payload) {
        // Broadcasts to ANY client subscribed to ANY playlist channel
        // Useful for global updates like library changes (until we scope library to playlist)
        for (const client of this.clients) {
            let isSubscribedToPlaylist = false;
            if (client.subscriptions) {
                for (const sub of client.subscriptions) {
                    if (sub.startsWith('playlist:')) {
                        isSubscribedToPlaylist = true;
                        break;
                    }
                }
            }
            if (isSubscribedToPlaylist) {
                this.send(client, type, payload);
            }
        }
    }

    broadcastToPlayers(type, payload) {
        for (const player of this.players) {
            this.send(player, type, payload);
        }
    }
}

module.exports = WebSocketManager;
