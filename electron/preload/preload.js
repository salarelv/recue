const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Get available displays
    getDisplays: () => ipcRenderer.invoke('get-displays'),

    // Open player window on specific display
    openPlayer: (displayId, playlistId) =>
        ipcRenderer.invoke('open-player', displayId, playlistId),

    // Close player window
    closePlayer: () => ipcRenderer.invoke('close-player'),

    // Get server URL
    getServerUrl: () => ipcRenderer.invoke('get-server-url')
});
