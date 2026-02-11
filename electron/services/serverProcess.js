const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

class ServerProcess {
    constructor() {
        this.serverProcess = null;
        this.port = process.env.PORT || 3000;
    }

    start() {
        return new Promise((resolve, reject) => {
            const isPackaged = app.isPackaged;
            const serverPath = isPackaged
                ? path.join(process.resourcesPath, 'app.asar.unpacked/server/src/index.js')
                : path.join(__dirname, '../../server/src/index.js');

            console.log(`[ServerProcess] Starting server from: ${serverPath}`);

            // Use process.execPath (the electron binary) to spawn the node process
            // This ensures it works in Flatpak where 'node' is not available
            this.serverProcess = spawn(process.execPath, [serverPath], {
                env: {
                    ...process.env,
                    PORT: this.port,
                    ELECTRON_RUN_AS_NODE: 1
                },
                stdio: 'pipe'
            });

            let serverReady = false;

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[Server] ${output}`);

                // Wait for server ready message
                if (output.includes('Server listening at') && !serverReady) {
                    serverReady = true;
                    console.log('[ServerProcess] Server is ready');
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error(`[Server Error] ${data.toString()}`);
            });

            this.serverProcess.on('error', (error) => {
                console.error('[ServerProcess] Failed to start server:', error);
                reject(error);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`[ServerProcess] Server process exited with code ${code}`);
                this.serverProcess = null;
            });

            // Timeout fallback if server doesn't report ready
            setTimeout(() => {
                if (!serverReady) {
                    console.log('[ServerProcess] Server timeout, assuming ready');
                    resolve();
                }
            }, 5000);
        });
    }

    stop() {
        if (this.serverProcess) {
            console.log('[ServerProcess] Stopping server...');
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    getServerUrl() {
        return `http://localhost:${this.port}`;
    }
}

module.exports = ServerProcess;
