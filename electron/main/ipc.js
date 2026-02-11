const { ipcMain, screen } = require('electron');

class IpcHandlers {
    constructor(serverProcess, managerWindow, playerWindow) {
        this.serverProcess = serverProcess;
        this.managerWindow = managerWindow;
        this.playerWindow = playerWindow;
    }

    register() {
        // Get all available displays
        ipcMain.handle('get-displays', () => {
            const displays = screen.getAllDisplays();
            return displays.map(display => ({
                id: display.id,
                label: display.label,
                bounds: display.bounds,
                workArea: display.workArea,
                scaleFactor: display.scaleFactor,
                rotation: display.rotation,
                internal: display.internal,
                primary: display === screen.getPrimaryDisplay(),
                active: this.playerWindow.isWindowOpen(display.id)
            }));
        });

        // Open player on specific display
        ipcMain.handle('open-player', async (event, displayId, playlistId) => {
            console.log(`[IPC] Opening player on display ${displayId} with playlist ${playlistId}`);
            const window = this.playerWindow.create(displayId, playlistId);
            this.notifyDisplayChange();
            return window !== null;
        });

        // Close player window
        ipcMain.handle('close-player', async (event, displayId) => {
            console.log(`[IPC] Closing player on display ${displayId || 'all'}`);
            this.playerWindow.close(displayId);
            this.notifyDisplayChange();
            return true;
        });

        // Listen for window closures to update UI
        this.playerWindow.on('display-changed', () => {
            console.log('[IPC] Display window closed, notifying server');
            this.notifyDisplayChange();
        });

        // Create manager window
        this.managerWindow.create();
        console.log('[IPC] Handlers registered');
    }

    async notifyDisplayChange() {
        try {
            const url = `${this.serverProcess.getServerUrl()}/api/displays/event`;
            const http = require('http');
            const req = http.request(url, { method: 'POST' });
            req.on('error', (e) => console.error(`[IPC] Failed to notify display change: ${e.message}`));
            req.end();
        } catch (e) {
            console.error('[IPC] Error in notifyDisplayChange:', e);
        }
    }
}

module.exports = IpcHandlers;
