class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.listeners = {};
        this.playlistId = null;
        this.isConnected = false;
    }

    init(playlistId) {
        this.playlistId = playlistId;
        this.connect();
    }

    connect() {
        if (this.socket) {
            this.socket.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.hostname}:3000/ws`;

        console.log('Connecting to WebSocket...', url);
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('WebSocket Connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Register as player
            this.send('session:register', { role: 'player', playlistId: this.playlistId });

            // Subscribe to playlist channel
            if (this.playlistId) {
                this.send('subscribe', { channel: `playlist:${this.playlistId}` });
            }

            this.emit('connected');
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket Disconnected');
            this.isConnected = false;
            this.emit('disconnected');
            this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s... max 30s
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            this.reconnectAttempts++;
            console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('Max reconnect attempts reached');
            this.emit('error', 'Connection lost');
        }
    }

    handleMessage(data) {
        const { type, payload } = data;
        // Broadcast to listeners
        this.emit(type, payload);

        // Also emit specific command types if it's a command
        if (type === 'control:command') {
            this.emit('command', payload);
        }
    }

    send(type, payload = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, payload }));
        } else {
            console.warn('Cannot send message, socket not open', type);
        }
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
}

export default new WebSocketService();
