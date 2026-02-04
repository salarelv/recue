const Fastify = require('fastify');
const path = require('path');
const websocket = require('@fastify/websocket');
const WebSocketManager = require('./managers/WebSocketManager');
const OSCManager = require('./managers/OSCManager');

async function startServer(port) {
    const fastify = Fastify({ logger: true });

    // Register WebSocket support
    await fastify.register(websocket);

    // Initialize Managers
    // Pass null for now, hook up circular dependency carefully if needed
    // Ideally OSCManager sends commands via WSManager to Player
    const oscManager = new OSCManager();
    const wsManager = new WebSocketManager(fastify, oscManager);

    // Give OSC Manager access to WS Manager
    oscManager.wsManager = wsManager;
    fastify.wsManager = wsManager; // Attach to fastify for API routes

    // Start OSC Listener
    await oscManager.start();

    // Register API Routes
    fastify.register(require('./routes/api'), { prefix: '/api' });

    // Serve static files (optional, if server is to serve the built clients)
    fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, '../../manager/dist'),
        prefix: '/manager',
    });

    fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, '../../player/dist'),
        prefix: '/player',
        decorateReply: false // Avoid decorator conflict
    });

    fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, '../storage/playlists'),
        prefix: '/media',
        decorateReply: false
    });

    fastify.register(require('@fastify/multipart'));

    fastify.post('/api/upload', async (req, reply) => {
        const data = await req.file();
        if (!data) {
            reply.code(400).send({ message: 'No file uploaded' });
            return;
        }

        const playlistId = data.fields.playlistId ? data.fields.playlistId.value : null;
        let metadata = {};

        if (data.fields.metadata) {
            try {
                metadata = JSON.parse(data.fields.metadata.value);
                console.log(`[Upload] Received metadata for ${data.filename}:`, metadata.type);
            } catch (e) {
                console.error('[Upload] Error parsing metadata field', e);
            }
        }

        if (!playlistId) {
            reply.code(400).send({ message: 'playlistId field required' });
            return;
        }

        const MediaManager = require('./managers/MediaManager');

        // data is compatible with the "file" object expected by saveFile (has .file stream and .filename)
        if (await MediaManager.saveFile(playlistId, data, metadata)) {
            if (oscManager.wsManager) {
                const media = await MediaManager.listMedia(playlistId);
                oscManager.wsManager.broadcastToPlaylist(playlistId, 'library:list', media);
            }
            return { message: 'File uploaded successfully' };
        } else {
            reply.code(500).send({ message: 'Upload failed' });
        }
    });

    // Add dynamic item
    fastify.post('/api/library/item', async (req, reply) => {
        const { playlistId, item } = req.body;
        if (!playlistId || !item) {
            reply.code(400).send({ error: 'PlaylistId and item required' });
            return;
        }

        const MediaManager = require('./managers/MediaManager');
        if (await MediaManager.addDynamicItem(playlistId, item)) {
            if (oscManager.wsManager) {
                const media = await MediaManager.listMedia(playlistId);
                oscManager.wsManager.broadcastToPlaylist(playlistId, 'library:list', media);
            }
            return { message: 'Item added' };
        } else {
            reply.code(500).send({ error: 'Failed to add item' });
        }
    });

    try {
        await fastify.listen({ port, host: '0.0.0.0' });
        return fastify;
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

module.exports = startServer;
