const fs = require('fs').promises;
const path = require('path');
const StateManager = require('./StateManager');

class PlaylistManager {
    constructor(storagePath) {
        this.storagePath = storagePath || path.join(__dirname, '../../storage/playlists');
        this.configPath = path.join(this.storagePath, '../config.json');
        this.ensureStorage();
    }

    async getLatestPlaylistId() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            const data = JSON.parse(content);
            return data.latestPlaylistId || 'default';
        } catch (error) {
            return 'default';
        }
    }

    async setLatestPlaylistId(id) {
        try {
            const data = { latestPlaylistId: id };
            await fs.writeFile(this.configPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving latest playlist ID:', error);
        }
    }

    async ensureStorage() {
        try {
            await fs.mkdir(this.storagePath, { recursive: true });

            // Check if any playlists exist (by checking directories)
            const entries = await fs.readdir(this.storagePath, { withFileTypes: true });
            const playlistDirs = entries.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

            if (playlistDirs.length === 0) {
                console.log('No playlists found, creating default playlist');
                await this.savePlaylist('default', {
                    name: 'Default Playlist',
                    items: []
                });
            }

            // Load latest playlist into state
            const latestId = await this.getLatestPlaylistId();
            StateManager.updatePlayerState({ playlistId: latestId });

        } catch (error) {
            console.error('Error creating storage directory or default playlist:', error);
        }
    }

    async listPlaylists() {
        try {
            const entries = await fs.readdir(this.storagePath, { withFileTypes: true });
            const playlists = [];
            for (const dirent of entries) {
                if (dirent.isDirectory()) {
                    const id = dirent.name;
                    const playlistPath = path.join(this.storagePath, id, 'playlist.json');
                    try {
                        await fs.access(playlistPath); // Check if playlist.json exists
                        const content = await fs.readFile(playlistPath, 'utf-8');
                        const playlist = JSON.parse(content);
                        playlists.push(this._decoratePlaylist(playlist));
                    } catch (e) {
                        // console.warn(`Skipping invalid playlist directory ${id}:`, e.message);
                    }
                }
            }
            return playlists;
        } catch (error) {
            console.error('Error listing playlists:', error);
            return [];
        }
    }

    async getPlaylist(id) {
        try {
            const filePath = path.join(this.storagePath, id, 'playlist.json');
            const content = await fs.readFile(filePath, 'utf-8');
            const playlist = JSON.parse(content);
            return this._decoratePlaylist(playlist);
        } catch (error) {
            console.error(`Error getting playlist ${id}:`, error);
            return null;
        }
    }

    _decoratePlaylist(playlist) {
        if (!playlist || !playlist.items) return playlist;
        const playlistId = playlist.id;
        playlist.items = playlist.items.map(m => ({
            ...m,
            path: (m.type === 'image' || m.type === 'video') && m.filename ? `/media/${playlistId}/media/${m.filename}` : m.path,
            thumbnailPath: m.thumbnail && !m.thumbnail.startsWith('data:') ? `/media/${playlistId}/media/${m.thumbnail}` : m.thumbnailPath
        }));
        return playlist;
    }

    async savePlaylist(id, data) {
        try {
            const playlistDir = path.join(this.storagePath, id);
            await fs.mkdir(playlistDir, { recursive: true });

            // Ensure media directory exists too
            await fs.mkdir(path.join(playlistDir, 'media'), { recursive: true });

            const filePath = path.join(playlistDir, 'playlist.json');
            // Ensure ID is consistent
            data.id = id;
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error saving playlist ${id}:`, error);
            return false;
        }
    }

    async deletePlaylist(id) {
        try {
            const playlistDir = path.join(this.storagePath, id);
            // Recursive delete of directory
            await fs.rm(playlistDir, { recursive: true, force: true });
            return true;
        } catch (error) {
            console.error(`Error deleting playlist ${id}:`, error);
            return false;
        }
    }
    async updateMediaItem(playlistId, mediaId, updates) {
        try {
            const playlist = await this.getPlaylist(playlistId);
            if (!playlist || !playlist.items) return false;

            let modified = false;
            playlist.items = playlist.items.map(item => {
                if (item.mediaId === mediaId) {
                    modified = true;
                    // Update only specific fields (filename, type, duration if needed)
                    // Be careful not to overwrite playlist-specific overrides (like duration loop)
                    // But if filename changes, we MUST update it.
                    // Also if we have a path property, update it.
                    return { ...item, ...updates };
                }
                return item;
            });

            if (modified) {
                await this.savePlaylist(playlistId, playlist);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error updating media item ${mediaId} in playlist ${playlistId}:`, error);
            return false;
        }
    }
}

module.exports = new PlaylistManager();
