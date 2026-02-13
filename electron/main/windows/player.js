const { BrowserWindow, screen, app } = require('electron');
const path = require('path');
const EventEmitter = require('events');

class PlayerWindow extends EventEmitter {
    constructor(serverUrl) {
        super();
        this.windows = new Map(); // Map of displayId -> BrowserWindow
        this.serverUrl = serverUrl;
    }

    create(displayId, playlistId) {
        // Close all existing players to ensure only one is active
        this.close();

        const displays = screen.getAllDisplays();
        const targetDisplay = displays.find(d => d.id === displayId);

        if (!targetDisplay) {
            console.error(`[PlayerWindow] Display ${displayId} not found`);
            return null;
        }

        const { x, y, width, height } = targetDisplay.bounds;

        const playerWindow = new BrowserWindow({
            x,
            y,
            width,
            height,
            fullscreen: false,
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, '../../preload/preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                autoplayPolicy: 'no-user-gesture-required'
            },
            title: 'Recue Player'
        });

        // Load player app with playlist ID
        const playerUrl = `${this.serverUrl}/player/?playlistId=${playlistId}`;
        playerWindow.loadURL(playerUrl);

        // Open DevTools in development
        if (!app.isPackaged) {
            playerWindow.webContents.openDevTools();
        }

        playerWindow.on('closed', () => {
            this.windows.delete(displayId);
            this.emit('display-changed');
        });

        this.windows.set(displayId, playerWindow);
        return playerWindow;
    }

    close(displayId) {
        if (displayId) {
            // Close specific player window
            const window = this.windows.get(displayId);
            if (window) {
                window.close();
            }
        } else {
            // Close all player windows
            for (const window of this.windows.values()) {
                window.close();
            }
            this.windows.clear();
        }
    }

    isWindowOpen(displayId) {
        return this.windows.has(displayId);
    }

    getWindow(displayId) {
        return this.windows.get(displayId);
    }

    getAllWindows() {
        return Array.from(this.windows.values());
    }
}

module.exports = PlayerWindow;
