const { BrowserWindow, app } = require('electron');
const path = require('path');

class ManagerWindow {
    constructor(serverUrl) {
        this.window = null;
        this.serverUrl = serverUrl;
    }

    create() {
        if (this.window) {
            this.window.focus();
            return this.window;
        }

        this.window = new BrowserWindow({
            width: 1280,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, '../../preload/preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            },
            title: 'Recue Manager'
        });

        // Load manager app from server
        this.window.loadURL(`${this.serverUrl}/manager/`);

        this.window.on('closed', () => {
            this.window = null;
        });

        return this.window;
    }

    getWindow() {
        return this.window;
    }

    close() {
        if (this.window) {
            this.window.close();
        }
    }
}

module.exports = ManagerWindow;
