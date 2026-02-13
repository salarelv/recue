const { app, Menu, BrowserWindow, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let aboutWindow = null;

function createAboutWindow() {
    if (aboutWindow) {
        aboutWindow.focus();
        return;
    }

    aboutWindow = new BrowserWindow({
        width: 400,
        height: 250,
        resizable: false,
        minimizable: false,
        maximizable: false,
        title: 'About Recue',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    const version = app.getVersion();

    // Create a simple HTML string for the about page
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>About Recue</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
                color: #333;
                user-select: none;
            }
            @media (prefers-color-scheme: dark) {
                body {
                    background-color: #222;
                    color: #eee;
                }
                a {
                    color: #64b5f6;
                }
            }
            h1 { margin: 0 0 10px; font-size: 24px; }
            p { margin: 5px 0; }
            a { color: #1976d2; text-decoration: none; cursor: pointer; }
            a:hover { text-decoration: underline; }
            .version { color: #666; font-size: 14px; margin-bottom: 20px; }
            @media (prefers-color-scheme: dark) {
                .version { color: #aaa; }
            }
            button {
                padding: 8px 16px;
                cursor: pointer;
                background: #ddd;
                border: none;
                border-radius: 4px;
                margin-top: 20px;
            }
            @media (prefers-color-scheme: dark) {
                button { background: #444; color: #fff; }
            }
        </style>
    </head>
    <body>
        <h1>Recue</h1>
        <div class="version">Version ${version}</div>
        <p>
            <a id="link" href="#">https://recue.live</a>
        </p>
        <script>
            document.getElementById('link').addEventListener('click', (e) => {
                e.preventDefault();
                // We'll handle this via window.open which electron captures, 
                // or we can just rely on will-navigate if we were loading a remote URL.
                // But since this is data URL, simplest is to use window.open and handle in main process
                // or use a preload script. 
                // Actually, for a data URL without preload, we can't require 'electron'.
                // So we will intercept the click in the main process via 'will-navigate' or 'new-window' event on webContents,
                // OR we can just standard href and intercept it.
            });
        </script>
    </body>
    </html>
    `;

    aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Handle link clicks
    aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Also handle direct navigation if the link is clicked and standard navigation events fire
    aboutWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== aboutWindow.webContents.getURL()) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Inject script to handle link click to trigger navigation (which we intercept)
    aboutWindow.webContents.on('did-finish-load', () => {
        aboutWindow.webContents.executeJavaScript(`
            document.getElementById('link').onclick = (e) => {
                e.preventDefault();
                window.location.href = 'https://recue.live';
            };
        `);
    });

    aboutWindow.on('closed', () => {
        aboutWindow = null;
    });
}

function createMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        // { role: 'appMenu' }
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' }, // Default macOS about
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' },
                { type: 'separator' },
                {
                    label: 'Change Storage Location...',
                    click: async () => {
                        const { default: Store } = await import('electron-store');
                        const store = new Store();
                        const currentPath = store.get('storagePath');

                        const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
                            title: 'Select Storage Location',
                            defaultPath: currentPath,
                            properties: ['openDirectory', 'createDirectory']
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            const newPath = result.filePaths[0];

                            // Ask for migration
                            const { response: migrationResponse } = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                                type: 'question',
                                title: 'Migrate Data?',
                                message: 'Do you want to copy your existing playlists and media to the new location?',
                                buttons: ['Yes, copy data', 'No, start fresh', 'Cancel'],
                                defaultId: 0,
                                cancelId: 2
                            });

                            if (migrationResponse === 2) return; // Cancel

                            if (migrationResponse === 0) {
                                const oldRoot = store.get('storagePath');
                                let sourcePath;

                                if (oldRoot) {
                                    sourcePath = path.join(oldRoot, 'playlists');
                                } else {
                                    // Determine default path based on environment
                                    if (app.isPackaged) {
                                        sourcePath = path.join(process.resourcesPath, 'app.asar.unpacked/server/storage/playlists');
                                    } else {
                                        sourcePath = path.join(__dirname, '../../server/storage/playlists');
                                    }
                                }

                                const destPath = path.join(newPath, 'playlists');

                                try {
                                    if (fs.existsSync(sourcePath)) {
                                        // Use cp for recursive copy (Node 16.7+)
                                        // Electron 28+ uses Node 18+
                                        await fs.promises.cp(sourcePath, destPath, { recursive: true });
                                    }
                                } catch (error) {
                                    dialog.showErrorBox('Migration Failed', `Failed to copy data: ${error.message}`);
                                    return;
                                }
                            }

                            store.set('storagePath', newPath);

                            const response = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
                                type: 'info',
                                title: 'Restart Required',
                                message: 'The application needs to restart to apply the new storage location.',
                                buttons: ['Restart Now', 'Later'],
                                defaultId: 0
                            });

                            if (response.response === 0) {
                                app.relaunch();
                                app.quit();
                            }
                        }
                    }
                }
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools', accelerator: 'F12' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        // { role: 'windowMenu' }
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://recue.live');
                    }
                },
                ...(isMac ? [] : [
                    { type: 'separator' },
                    {
                        label: 'About Recue',
                        click: createAboutWindow
                    }
                ])
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

module.exports = { createMenu };
