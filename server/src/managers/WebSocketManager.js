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

            case 'player:loading':
                if (payload.mediaId) {
                    const playlistId = payload.playlistId || StateManager.getPlayerState().playlistId || 'default';
                    const statuses = StateManager.updateItemStatus(playlistId, payload.mediaId, 'loading');
                    this.broadcastToPlaylist(playlistId, 'player:itemStatuses', statuses);
                }
                break;

            case 'player:ready':
                if (payload.mediaId) {
                    const playlistId = payload.playlistId || StateManager.getPlayerState().playlistId || 'default';
                    const statuses = StateManager.updateItemStatus(playlistId, payload.mediaId, 'ready');
                    this.broadcastToPlaylist(playlistId, 'player:itemStatuses', statuses);
                }
                break;

            case 'player:error':
                if (payload.mediaId) {
                    const playlistId = payload.playlistId || StateManager.getPlayerState().playlistId || 'default';
                    const statuses = StateManager.updateItemStatus(playlistId, payload.mediaId, 'error');
                    this.broadcastToPlaylist(playlistId, 'player:itemStatuses', statuses);
                }
                break;

            case 'player:error:detail':
                if (payload.itemId) {
                    const playlistId = payload.playlistId || StateManager.getPlayerState().playlistId || 'default';
                    this.broadcastToPlaylist(playlistId, 'notification:new', {
                        id: Date.now(),
                        type: 'error',
                        title: 'Playback Error',
                        message: `Failed to play "${payload.itemName}": ${payload.error}`,
                        timestamp: new Date().toISOString()
                    });
                }
                break;

            case 'player:time':
                // Update persistent state
                const currentStatus = StateManager.getPlayerState();
                if (payload.itemId === currentStatus.itemId) {
                    StateManager.updatePlayerState({
                        currentTime: payload.currentTime
                    });
                }

                // Broadcast time updates to listeners (manager)
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

            // Mark as connected in state
            StateManager.updatePlayerState({ connected: true });

            // Check if we should resume
            const state = StateManager.getPlayerState();
            if (state.itemId && state.status === 'playing') {
                console.log('Resuming player to:', state.itemId, 'at', state.currentTime);
                this.send(socket, 'control:command', {
                    command: 'resume',
                    mediaId: state.itemId,
                    startTime: state.currentTime
                });
            }

            // Sync managers
            this.broadcastToAllPlaylists('player:state', state);

        } else if (role === 'manager') {
            this.managers.add(socket);
            socket.role = 'manager';
            StateManager.setManagerConnected(true);
            console.log('Registered Manager');

            // Sync new manager with current player status
            this.send(socket, 'player:state', StateManager.getPlayerState());
        }
    }

    handleDisconnect(socket) {
        this.clients.delete(socket);
        if (socket.role === 'player') {
            this.players.delete(socket);
            console.log('Player disconnected');

            // Mark as disconnected
            StateManager.updatePlayerState({ connected: false });

            // Broadast to managers so they can grey out UI
            const playlistId = StateManager.getPlayerState().playlistId || 'default';
            this.broadcastToPlaylist(playlistId, 'player:state', StateManager.getPlayerState());

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
