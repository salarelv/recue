class StateManager {
    constructor() {
        this.state = {
            player: {
                status: 'stopped', // playing, paused, stopped
                currentMediaId: null,
                currentTime: 0,
                volume: 1,
                muted: false,
                playlistId: 'default'
            },
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

    setManagerConnected(connected) {
        this.state.manager.connected = connected;
    }
}

module.exports = new StateManager();
