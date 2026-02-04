class WebSocketService {
    constructor() {
        this.socket = null;
        this.store = null;
        this.url = `ws://${window.location.hostname}:3000/ws`;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    init(store) {
        this.store = store;
        this.connect();
    }

    connect() {
        console.log('Connecting to WebSocket...', this.url);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log('WebSocket Connected');
            this.reconnectAttempts = 0;
            this.send('session:register', { role: 'manager' });
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.socket.onclose = () => {
            console.log('WebSocket Disconnected');
            this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            setTimeout(() => this.connect(), 2000);
        }
    }

    subscribe(channel) {
        this.send('subscribe', { channel });
    }

    unsubscribe(channel) {
        this.send('unsubscribe', { channel });
    }

    handleMessage(data) {
        const { type, payload } = data;
        // console.log(`Received: ${type}`, payload);

        switch (type) {
            case 'library:list':
                // We received a library update via our subscribed channel
                this.store.commit('appData/SET_LIBRARY', payload);
                break;
            case 'playlist:updated':
                // Playlist updated, tell store to refresh if it's the current one or list
                this.store.dispatch('playlists/refreshPlaylists'); // Actually we might want to just re-fetch the current one?
                // Ideally, the payload includes the update, but we kept it simple.
                // If we are editing, we might get a notify.
                break;
            case 'player:state':
                this.store.commit('playlists/SET_ACTIVE_PLAYLIST_ID', payload.playlistId);
                this.store.commit('appData/SET_PLAYER_CONNECTED', payload.connected);
                this.store.commit('appData/SET_PLAYER_STATUS', payload.status || 'stopped');
                if (payload.itemId) {
                    this.store.commit('appData/SET_PLAYING_ITEM', payload.itemId);
                }
                break;
            case 'player:itemStatuses':
                this.store.commit('appData/SET_ITEM_STATUSES', payload);
                break;
            case 'player:time':
                // Calculate progress as percentage and update store
                if (payload.duration > 0) {
                    const progress = (payload.currentTime / payload.duration) * 100;
                    this.store.dispatch('appData/updateProgress', progress);
                }
                break;
            case 'notification:new':
                this.store.dispatch('notifications/add', payload);
                break;
        }
    }

    send(type, payload = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, payload }));
        }
    }
}

export default new WebSocketService();
