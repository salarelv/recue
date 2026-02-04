const fs = require('fs').promises;
const path = require('path');

const DEFAULT_DURATION = 10000;

class MediaManager {
    constructor() {
        this.baseStoragePath = path.join(__dirname, '../../storage/playlists');
    }

    getPlaylistPath(playlistId) {
        return path.join(this.baseStoragePath, playlistId);
    }

    getMediaPath(playlistId) {
        return path.join(this.getPlaylistPath(playlistId), 'media');
    }

    getMediaConfigPath(playlistId) {
        return path.join(this.getPlaylistPath(playlistId), 'media.json');
    }

    async ensureMediaStorage(playlistId) {
        try {
            await fs.mkdir(this.getMediaPath(playlistId), { recursive: true });
        } catch (error) {
            console.error(`Error creating media storage for playlist ${playlistId}:`, error);
        }
    }

    async listMedia(playlistId) {
        try {
            if (!playlistId) return [];

            const configPath = this.getMediaConfigPath(playlistId);
            try {
                const content = await fs.readFile(configPath, 'utf-8');
                let media = JSON.parse(content);
                // Ensure URLs are correct
                media = media.map(m => ({
                    ...m,
                    path: m.type === 'image' || m.type === 'video' ? `/media/${playlistId}/media/${m.filename}` : undefined
                }));
                return media;
            } catch (e) {
                // If config doesn't exist, try to sync/create it?
                // Or just return empty. 
                // Let's return what sync finds if missing.
                return await this.syncMedia(playlistId);
            }
        } catch (error) {
            console.error('Error listing media:', error);
            return [];
        }
    }

    async syncMedia(playlistId) {
        try {
            await this.ensureMediaStorage(playlistId);
            const mediaPath = this.getMediaPath(playlistId);
            const configPath = this.getMediaConfigPath(playlistId);

            // Read existing config
            let currentMedia = [];
            try {
                const content = await fs.readFile(configPath, 'utf-8');
                currentMedia = JSON.parse(content);
            } catch (e) {
                // Config missing
            }

            // Scan directory
            let files = [];
            try {
                files = await fs.readdir(mediaPath);
            } catch (e) {
                // Directory might not exist or empty
            }

            const validExtensions = ['.mp4', '.webm', '.ogg', '.jpg', '.jpeg', '.png', '.gif', '.svg'];
            const fileSet = new Set(files);

            // Remove entries for missing files
            currentMedia = currentMedia.filter(m => {
                if (m.type === 'url' || m.type === 'website' || m.type === 'youtube') return true; // Keep dynamic items
                return fileSet.has(m.filename);
            });

            // Add entries for new files
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (!validExtensions.includes(ext)) continue;

                const exists = currentMedia.find(m => m.filename === file);
                if (!exists) {
                    let type = 'unknown';
                    if (['.mp4', '.webm', '.ogg'].includes(ext)) type = 'video';
                    else if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) type = 'image';

                    currentMedia.push({
                        id: `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        name: file,
                        type: type,
                        filename: file,
                        duration: DEFAULT_DURATION, // Default 10s in ms
                        thumbnail: '' // No thumbnail for auto-discovered files yet
                    });
                }
            }

            // Save updated config
            await fs.writeFile(configPath, JSON.stringify(currentMedia, null, 2));

            // Return decorated media
            return currentMedia.map(m => ({
                ...m,
                path: m.type === 'image' || m.type === 'video' ? `/media/${playlistId}/media/${m.filename}` : undefined
            }));

        } catch (error) {
            console.error(`Error syncing media for ${playlistId}:`, error);
            return [];
        }
    }

    async saveFile(playlistId, file, metadata = {}) {
        try {
            console.log(`[MediaManager] Saving file: ${file.filename} for playlist: ${playlistId}`);
            console.log(`[MediaManager] Metadata:`, JSON.stringify(metadata).substring(0, 100) + '...');

            await this.ensureMediaStorage(playlistId);
            const filename = file.filename;
            const savePath = path.join(this.getMediaPath(playlistId), filename);
            const fsDirect = require('fs');

            await new Promise((resolve, reject) => {
                const writeStream = fsDirect.createWriteStream(savePath);
                file.file.pipe(writeStream);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            // Update media.json using raw config to avoid decoration mismatch
            const rawList = await this.readRawConfig(playlistId);
            const existingIdx = rawList.findIndex(m => m.filename === filename);

            const newItem = {
                id: metadata.id || `file-${Date.now()}`,
                name: metadata.name || filename,
                type: metadata.type || 'unknown',
                filename: filename,
                duration: metadata.duration || DEFAULT_DURATION,
                thumbnail: metadata.thumbnail || ''
            };

            if (existingIdx >= 0) {
                console.log(`[MediaManager] Updating existing entry at index ${existingIdx}`);
                rawList[existingIdx] = { ...rawList[existingIdx], ...newItem };
            } else {
                console.log(`[MediaManager] Adding new entry`);
                rawList.push(newItem);
            }

            await this.saveRawConfig(playlistId, rawList);
            console.log(`[MediaManager] Saved file and updated config successfully`);
            return true;
        } catch (error) {
            console.error('[MediaManager] Error saving file:', error);
            return false;
        }
    }

    async addDynamicItem(playlistId, item) {
        try {
            await this.ensureMediaStorage(playlistId);
            const rawList = await this.readRawConfig(playlistId);
            rawList.push({
                ...item,
                id: item.id || `dyn-${Date.now()}`
            });
            await this.saveRawConfig(playlistId, rawList);
            return true;
        } catch (error) {
            console.error('Error adding dynamic item:', error);
            return false;
        }
    }

    async readRawConfig(playlistId) {
        try {
            const configPath = this.getMediaConfigPath(playlistId);
            const content = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        } catch (e) {
            return [];
        }
    }

    async saveRawConfig(playlistId, data) {
        const configPath = this.getMediaConfigPath(playlistId);
        await fs.writeFile(configPath, JSON.stringify(data, null, 2));
    }

    async deleteMedia(playlistId, mediaId) {
        try {
            const rawList = await this.readRawConfig(playlistId);
            const index = rawList.findIndex(m => m.id === mediaId);
            if (index === -1) return false;

            const item = rawList[index];

            // If it's a file, delete it
            if (item.filename) {
                const filePath = path.join(this.getMediaPath(playlistId), item.filename);
                try {
                    await fs.unlink(filePath);
                    console.log(`[MediaManager] Deleted file: ${filePath}`);
                } catch (err) {
                    console.error(`[MediaManager] Error deleting file ${filePath}:`, err);
                    // Continue anyway to keep JSON in sync? Or fail?
                    // Usually better to keep going if the file is gone or inaccessible.
                }
            }

            rawList.splice(index, 1);
            await this.saveRawConfig(playlistId, rawList);

            // Cleanup playlist.json
            const playlistModified = await this.cleanupPlaylistReferences(playlistId, item);

            return { success: true, playlistModified };
        } catch (error) {
            console.error('[MediaManager] Error deleting media:', error);
            return { success: false };
        }
    }

    async cleanupPlaylistReferences(playlistId, deletedItem) {
        try {
            const playlistPath = path.join(this.getPlaylistPath(playlistId), 'playlist.json');
            const content = await fs.readFile(playlistPath, 'utf-8');
            const playlist = JSON.parse(content);

            const initialCount = playlist.items.length;
            playlist.items = playlist.items.filter(item => {
                // Main check: mediaId (added in this update)
                if (item.mediaId === deletedItem.id) return false;

                // Fallback check: filename or url (for legacy items)
                if (deletedItem.filename && item.filename === deletedItem.filename) return false;
                if (deletedItem.url && item.url === deletedItem.url) return false;

                return true;
            });

            if (playlist.items.length !== initialCount) {
                console.log(`[MediaManager] Removed ${initialCount - playlist.items.length} items from playlist ${playlistId}`);
                await fs.writeFile(playlistPath, JSON.stringify(playlist, null, 2));
                return true;
            }
            return false;
        } catch (err) {
            // Playlist might not exist yet, ignore
            return false;
        }
    }
}

module.exports = new MediaManager();
