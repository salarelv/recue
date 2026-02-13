const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');
const logger = require('../utils/logger');

const SERVER_STARTUP_TIMEOUT = 5000; // milliseconds

class ServerProcess {
    constructor() {
        this.serverProcess = null;
        this.port = process.env.PORT || 3000;
    }

    async start() {
        return new Promise(async (resolve, reject) => {
            const { default: Store } = await import('electron-store');
            const store = new Store();
            const storagePath = store.get('storagePath');

            const isPackaged = app.isPackaged;
            const serverPath = isPackaged
                ? path.join(process.resourcesPath, 'app.asar.unpacked/server/src/index.js')
                : path.join(__dirname, '../../server/src/index.js');

            logger.info('ServerProcess', `Starting server from: ${serverPath}`);
            if (storagePath) {
                logger.info('ServerProcess', `Using custom storage path: ${storagePath}`);
            }

            // Use process.execPath (the electron binary) to spawn the node process
            // This ensures it works in Flatpak where 'node' is not available
            this.serverProcess = spawn(process.execPath, [serverPath], {
                env: {
                    ...process.env,
                    PORT: this.port,
                    RECUE_STORAGE_PATH: storagePath,
                    ELECTRON_RUN_AS_NODE: 1
                },
                stdio: 'pipe'
            });

            let serverReady = false;

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                logger.debug('Server', output.trim());

                // Wait for server ready message
                if (output.includes('Server listening at') && !serverReady) {
                    serverReady = true;
                    logger.info('ServerProcess', 'Server is ready');
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                logger.error('Server', data.toString().trim());
            });

            this.serverProcess.on('error', (error) => {
                logger.error('ServerProcess', 'Failed to start server:', error);
                reject(error);
            });

            this.serverProcess.on('close', (code) => {
                logger.info('ServerProcess', `Server process exited with code ${code}`);
                this.serverProcess = null;
            });

            // Timeout fallback if server doesn't report ready
            setTimeout(() => {
                if (!serverReady) {
                    logger.warn('ServerProcess', 'Server timeout, assuming ready');
                    resolve();
                }
            }, SERVER_STARTUP_TIMEOUT);
        });
    }

    stop() {
        if (this.serverProcess) {
            logger.info('ServerProcess', 'Stopping server...');
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }

    getServerUrl() {
        return `http://localhost:${this.port}`;
    }
}

module.exports = ServerProcess;
