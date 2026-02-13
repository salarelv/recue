const StateManager = require('./StateManager');
const PlaylistManager = require('./PlaylistManager');
const MediaManager = require('./MediaManager');
const logger = require('../utils/logger');

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
            logger.error('WebSocketManager', 'WebSocket connection invalid:', connection);
            return;
        }

        this.clients.add(socket);
        socket.subscriptions = new Set(); // Track subscriptions for this socket

        logger.debug('WebSocketManager', 'New WebSocket connection');

        socket.on('message', async (message) => {
            try {
                const data = JSON.parse(message.toString());
                await this.handleMessage(socket, data);
            } catch (error) {
                logger.error('WebSocketManager', 'Error handling message:', error);
            }
        });

        socket.on('close', () => {
            this.handleDisconnect(socket);
        });

        socket.on('error', (err) => {
            logger.error('WebSocketManager', 'WebSocket error:', err);
            this.handleDisconnect(socket);
        });
    }

    /**
     * Helper to extract playlistId from payload with fallback
     */
    getPlaylistId(payload) {
        return payload.playlistId || StateManager.getPlayerState().playlistId || 'default';
    }

    async handleMessage(socket, data) {
        const { type, payload } = data;
        logger.debug('WebSocketManager', `Received message: ${type}`, payload ? Object.keys(payload) : '');

        switch (type) {
            case 'session:register':
                this.registerClient(socket, payload.role);
                break;

            case 'subscribe':
                if (payload.channel) {
                    socket.subscriptions.add(payload.channel);
                    logger.debug('WebSocketManager', `Client subscribed to ${payload.channel}`);
                }
                break;

            case 'unsubscribe':
                if (payload.channel) {
                    socket.subscriptions.delete(payload.channel);
                    logger.debug('WebSocketManager', `Client unsubscribed from ${payload.channel}`);
                }
                break;

            // --- Player Control (Manager -> Player) ---
            case 'command:player':
                this.broadcastToPlayers('control:command', payload);
                break;

            // --- Player Status Updates (Player -> Manager) ---
            case 'player:status':
                StateManager.updatePlayerState(payload);
                const playlistId = this.getPlaylistId(payload);
                this.broadcastToPlaylist(playlistId, 'player:state', StateManager.getPlayerState());
                break;

            case 'player:loading':
                if (payload.mediaId) {
                    const playlistIdLoading = this.getPlaylistId(payload);
                    const statuses = StateManager.updateItemStatus(playlistIdLoading, payload.mediaId, 'loading');
                    this.broadcastToPlaylist(playlistIdLoading, 'player:itemStatuses', statuses);
                }
                break;

            case 'player:ready':
                if (payload.mediaId) {
                    const playlistIdReady = this.getPlaylistId(payload);
                    const statusesReady = StateManager.updateItemStatus(playlistIdReady, payload.mediaId, 'ready');
                    this.broadcastToPlaylist(playlistIdReady, 'player:itemStatuses', statusesReady);
                }
                break;

            case 'player:error':
                if (payload.mediaId) {
                    const playlistIdError = this.getPlaylistId(payload);
                    const statusesError = StateManager.updateItemStatus(playlistIdError, payload.mediaId, 'error');
                    this.broadcastToPlaylist(playlistIdError, 'player:itemStatuses', statusesError);
                }
                break;

            case 'player:error:detail':
                if (payload.itemId) {
                    const playlistIdErrorDetail = this.getPlaylistId(payload);
                    this.broadcastToPlaylist(playlistIdErrorDetail, 'notification:new', {
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
                this.broadcastToPlaylist(this.getPlaylistId(payload), 'player:time', payload);
                break;

            case 'player:event':
                logger.debug('WebSocketManager', 'Player event', payload);
                this.broadcastToPlaylist(this.getPlaylistId(payload), 'player:event', payload);
                break;

            default:
                logger.warn('WebSocketManager', `Unknown message type: ${type}`);
        }
    }

    registerClient(socket, role) {
        if (role === 'player') {
            this.players.add(socket);
            socket.role = 'player';
            logger.info('WebSocketManager', 'Registered Player');

            // Mark as connected in state
            StateManager.updatePlayerState({ connected: true });

            // Check if we should resume
            const state = StateManager.getPlayerState();
            if (state.itemId && state.status === 'playing') {
                logger.debug('WebSocketManager', 'Resuming player to:', state.itemId, 'at', state.currentTime);
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
            logger.info('WebSocketManager', 'Registered Manager');

            // Sync new manager with current player status
            this.send(socket, 'player:state', StateManager.getPlayerState());
        }
    }

    handleDisconnect(socket) {
        this.clients.delete(socket);
        if (socket.role === 'player') {
            this.players.delete(socket);
            logger.info('WebSocketManager', 'Player disconnected');

            // Mark as disconnected
            StateManager.updatePlayerState({ connected: false });

            // Broadcast to managers so they can grey out UI
            const playlistId = StateManager.getPlayerState().playlistId || 'default';
            this.broadcastToPlaylist(playlistId, 'player:state', StateManager.getPlayerState());

        } else if (socket.role === 'manager') {
            this.managers.delete(socket);
            if (this.managers.size === 0) {
                StateManager.setManagerConnected(false);
            }
            logger.info('WebSocketManager', 'Manager disconnected');
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
