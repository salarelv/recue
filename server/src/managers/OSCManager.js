const osc = require('osc');
const StateManager = require('./StateManager');

class OSCManager {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.udpPort = null;
    }

    async getAvailablePort(startPort) {
        return new Promise((resolve, reject) => {
            const socket = require('dgram').createSocket('udp4');
            socket.on('error', (err) => {
                socket.close();
                if (err.code === 'EADDRINUSE') {
                    // Start port is in use, try next one
                    // Recurse with slight delay or immediate
                    resolve(this.getAvailablePort(startPort + 1));
                } else {
                    reject(err);
                }
            });

            socket.bind(startPort, () => {
                socket.close();
                resolve(startPort);
            });
        });
    }

    async start(port = 57121) {
        try {
            const validPort = await this.getAvailablePort(port);

            if (validPort !== port) {
                console.warn(`OSC Port ${port} is in use. Using ${validPort} instead.`);
            }

            this.udpPort = new osc.UDPPort({
                localAddress: "0.0.0.0",
                localPort: validPort,
                metadata: true
            });

            this.udpPort.on("message", (oscMsg, timeTag, info) => {
                this.handleMessage(oscMsg);
            });

            this.udpPort.on("error", (error) => {
                console.error("OSC Error:", error);
            });

            this.udpPort.open();
            console.log(`OSC listening on port ${validPort}`);
        } catch (e) {
            console.error("Failed to start OSC:", e);
        }
    }

    handleMessage(oscMsg) {
        const address = oscMsg.address;
        const args = oscMsg.args; // Array of { type, value }

        console.log("OSC Received:", address, args);

        // Map OSC commands to Player commands
        // /play, /pause, /stop, /next, /previous
        // /volume {float}, /mute {int 0/1}

        let command = null;
        let commandArgs = {};

        switch (address) {
            case "/play":
                command = "play";
                break;
            case "/pause":
                command = "pause";
                break;
            case "/stop":
                command = "stop";
                break;
            case "/next":
                command = "next";
                break;
            case "/previous":
                command = "previous";
                break;
            case "/volume":
                if (args.length > 0) {
                    command = "volume";
                    commandArgs = { volume: args[0].value };
                }
                break;
            case "/mute":
                if (args.length > 0) {
                    command = "mute";
                    commandArgs = { muted: args[0].value === 1 || args[0].value === true };
                }
                break;
            case "/fullscreen":
                // TODO: Handle window management if possible via server or forward to electron
                break;
        }

        if (command && this.wsManager) {
            this.wsManager.broadcastToPlayer('control:command', { command, ...commandArgs });
        }
    }

    send(address, args, ip, port) {
        if (this.udpPort) {
            this.udpPort.send({
                address: address,
                args: args
            }, ip, port);
        }
    }
}

module.exports = OSCManager;
