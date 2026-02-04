class StateManager {
    constructor() {
        this.state = {
            player: {
                status: 'stopped', // playing, paused, stopped
                itemId: null,
                currentTime: 0,
                volume: 1,
                muted: false,
                playlistId: 'default',
                connected: false
            },
            itemStatuses: {}, // { [playlistId]: { [mediaId]: 'loading' | 'ready' | 'error' } }
            manager: {
                connected: false
            }
        };
    }

    updatePlayerState(newState) {
        this.state.player = { ...this.state.player, ...newState };
        return this.state.player;
    }

    getPlayerState() {
        return this.state.player;
    }

    updateItemStatus(playlistId, mediaId, status) {
        if (!this.state.itemStatuses[playlistId]) {
            this.state.itemStatuses[playlistId] = {};
        }
        this.state.itemStatuses[playlistId][mediaId] = status;
        return this.state.itemStatuses[playlistId];
    }

    getItemStatuses(playlistId) {
        return this.state.itemStatuses[playlistId] || {};
    }

    setManagerConnected(connected) {
        this.state.manager.connected = connected;
    }
}

module.exports = new StateManager();
