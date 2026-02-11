const { app, BrowserWindow } = require('electron');
const path = require('path');
const ServerProcess = require('../services/serverProcess');
const ManagerWindow = require('./windows/manager');
const PlayerWindow = require('./windows/player');
const IpcHandlers = require('./ipc');
const { createMenu } = require('./menu');

// Initialize services
const serverProcess = new ServerProcess();
let managerWindow = null;
let playerWindow = null;
let ipcHandlers = null;


async function initialize() {
    createMenu();
    try {
        // Start the server first
        console.log('[Main] Starting server...');
        await serverProcess.start();

        const serverUrl = serverProcess.getServerUrl();
        console.log(`[Main] Server ready at ${serverUrl}`);

        // Initialize window managers
        managerWindow = new ManagerWindow(serverUrl);
        playerWindow = new PlayerWindow(serverUrl);

        // Register IPC handlers
        ipcHandlers = new IpcHandlers(serverProcess, managerWindow, playerWindow);
        ipcHandlers.register();

        // Create manager window
        managerWindow.create();
        console.log('[Main] Manager window created');

    } catch (error) {
        console.error('[Main] Failed to initialize:', error);
        app.quit();
    }
}

// App lifecycle handlers
app.whenReady().then(initialize);

app.on('window-all-closed', () => {
    // On macOS it is common for applications to stay open until the user explicitly quits
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        if (managerWindow) {
            managerWindow.create();
        }
    }
});

app.on('before-quit', () => {
    console.log('[Main] Shutting down...');
    serverProcess.stop();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('[Main] Unhandled rejection:', error);
});
