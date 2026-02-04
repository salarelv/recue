const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Start Server
const serverProcess = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, '../'),
    stdio: 'inherit'
});

const WS_URL = 'ws://localhost:3000/ws';

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('Waiting for server to start...');
    await wait(2000);

    console.log('Connecting Manager...');
    const managerWs = new WebSocket(WS_URL);

    console.log('Connecting Player...');
    const playerWs = new WebSocket(WS_URL);

    const managerPromise = new Promise((resolve, reject) => {
        managerWs.on('open', () => {
            managerWs.send(JSON.stringify({ type: 'session:register', payload: { role: 'manager' } }));
            console.log('Manager connected and registered');
        });

        managerWs.on('message', (data) => {
            const msg = JSON.parse(data);
            console.log('Manager received:', msg);
            if (msg.type === 'player:state' && msg.payload.status === 'playing') {
                console.log('SUCCESS: Manager received player state update');
                resolve();
            }
        });
    });

    const playerPromise = new Promise((resolve, reject) => {
        playerWs.on('open', () => {
            playerWs.send(JSON.stringify({ type: 'session:register', payload: { role: 'player' } }));
            console.log('Player connected and registered');
        });

        playerWs.on('message', (data) => {
            const msg = JSON.parse(data);
            console.log('Player received:', msg);
            if (msg.type === 'control:command' && msg.payload.command === 'play') {
                console.log('SUCCESS: Player received play command');
                // Simulate player state update
                playerWs.send(JSON.stringify({
                    type: 'player:status',
                    payload: { status: 'playing', currentTime: 0 }
                }));
            }
        });
    });

    // Test Flow:
    // 1. Manager sends 'command:player' -> 'play'
    // 2. Server relays to Player
    // 3. Player receives 'control:command'
    // 4. Player sends 'player:status' -> 'playing'
    // 5. Server relays to Manager
    // 6. Manager receives 'player:state'

    await wait(1000); // Wait for registration
    console.log('Sending Play command from Manager...');
    managerWs.send(JSON.stringify({
        type: 'command:player',
        payload: { command: 'play' }
    }));

    try {
        await Promise.all([managerPromise, playerPromise]);
        console.log('ALL TESTS PASSED');
    } catch (e) {
        console.error('TEST FAILED', e);
    } finally {
        managerWs.close();
        playerWs.close();
        serverProcess.kill();
        process.exit(0);
    }
}

runTests();
