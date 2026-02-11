const { app, Menu, BrowserWindow, shell } = require('electron');
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
                isMac ? { role: 'close' } : { role: 'quit' }
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
                { role: 'toggleDevTools' },
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
