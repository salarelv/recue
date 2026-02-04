const PlaylistManager = require('../managers/PlaylistManager');
const MediaManager = require('../managers/MediaManager');
const StateManager = require('../managers/StateManager');
const YouTubeManager = require('../managers/YouTubeManager');

async function routes(fastify, options) {
    // YouTube Metadata
    fastify.post('/youtube/info', async (request, reply) => {
        const { url } = request.body;
        if (!url) {
            reply.code(400).send({ error: 'URL required' });
            return;
        }

        try {
            const info = await YouTubeManager.getVideoInfo(url);
            return info;
        } catch (error) {
            console.error('YouTube Info Error:', error);
            reply.code(500).send({ error: error.message });
        }
    });

    // Media Library
    fastify.get('/library', async (request, reply) => {
        const { playlistId } = request.query;
        // If no playlistId, maybe return empty or error? Or try default?
        // Let's require it or return empty
        if (!playlistId) return [];

        const media = await MediaManager.listMedia(playlistId);
        return media;
    });

    fastify.post('/library/resync', async (request, reply) => {
        const { playlistId } = request.body;
        if (!playlistId) {
            reply.code(400).send({ error: 'PlaylistId required' });
            return;
        }

        const media = await MediaManager.syncMedia(playlistId);

        if (fastify.wsManager) {
            fastify.wsManager.broadcastToPlaylist(playlistId, 'library:list', media);
        }

        return { message: 'Library resynced', count: media.length };
    });

    fastify.delete('/library/item', async (request, reply) => {
        const { playlistId, mediaId } = request.query;
        if (!playlistId || !mediaId) {
            reply.code(400).send({ error: 'PlaylistId and MediaId required' });
            return;
        }

        const { success, playlistModified } = await MediaManager.deleteMedia(playlistId, mediaId);
        if (success) {
            if (fastify.wsManager) {
                const media = await MediaManager.listMedia(playlistId);
                fastify.wsManager.broadcastToPlaylist(playlistId, 'library:list', media);

                if (playlistModified) {
                    fastify.wsManager.broadcastToPlaylist(playlistId, 'playlist:updated');
                }
            }
            return { message: 'Media deleted', playlistModified };
        } else {
            reply.code(500).send({ error: 'Failed to delete media' });
        }
    });

    // Playlists
    fastify.get('/playlists', async (request, reply) => {
        const playlists = await PlaylistManager.listPlaylists();
        return playlists;
    });

    fastify.get('/playlists/:id', async (request, reply) => {
        const { id } = request.params;
        const playlist = await PlaylistManager.getPlaylist(id);
        if (playlist) {
            return playlist;
        } else {
            reply.code(404).send({ error: 'Playlist not found' });
        }
    });

    // Set Active Playlist
    fastify.post('/state/playlist', async (request, reply) => {
        const { id } = request.body;
        if (!id) { // Allow setting to null? Or just validate presence.
            reply.code(400).send({ error: 'ID required' });
            return;
        }

        // Check if exists?
        const playlist = await PlaylistManager.getPlaylist(id);
        if (!playlist) {
            reply.code(404).send({ error: 'Playlist not found' });
            return;
        }

        await PlaylistManager.setLatestPlaylistId(id);
        StateManager.updatePlayerState({ playlistId: id });

        // Broadcast new state to relevant subscribers (playlist channel? or global player channel?)
        // Player state is broadcast to 'playlist:{id}' usually?
        // But if the playlist ID changed, subscribers to OLD ID won't get it?
        // Players usually subscribe to 'player' updates or similar? 
        // In WSManager, player:status broadcasts to broadcastToPlaylist(playlistId).
        // If we switch playlist, we should probably broadcast to the NEW playlist channel.
        // And maybe the OLD one too to say "Hey, I'm gone"?
        // Or just rely on Managers knowing they switched.
        // Players: We broadcast command:player to players directly. 
        // But we broadcast player:state to MANAGERS.
        // Let's broadcast to the new playlist channel.

        if (fastify.wsManager) {
            fastify.wsManager.broadcastToPlaylist(id, 'player:state', StateManager.getPlayerState());
        }

        return { message: 'Active playlist updated', playlistId: id };
    });

    // Save/Update Playlist
    fastify.post('/playlists/:id', async (request, reply) => {
        const { id } = request.params;
        const data = request.body;

        // Ensure ID in body matches param if present, or just use param
        if (data.id && data.id !== id) {
            reply.code(400).send({ error: 'ID mismatch' });
            return;
        }

        const success = await PlaylistManager.savePlaylist(id, data);
        if (success) {
            // Notify subscribers via WebSocketManager if available
            // We need to access the oscManager -> wsManager chain or ideally attach wsManager to fastify
            if (fastify.wsManager) {
                fastify.wsManager.broadcastToPlaylist(id, 'playlist:updated');
                // Also broadcast to 'all-playlists' or similar if we supported listing updates?
                // For now, listing is HTTP poll/refresh, but maybe we want to notify valid listings changed?
            }
            return { message: 'Playlist saved' };
        } else {
            reply.code(500).send({ error: 'Failed to save playlist' });
        }
    });

    // Create Playlist (optional, if we want a separate create endpoint without ID)
    // For now, the app seems to generate IDs on client or use timestamp

    fastify.delete('/playlists/:id', async (request, reply) => {
        const { id } = request.params;
        const success = await PlaylistManager.deletePlaylist(id);
        if (success) {
            return { message: 'Playlist deleted' };
        } else {
            reply.code(500).send({ error: 'Failed to delete playlist' });
        }
    });
}

module.exports = routes;
