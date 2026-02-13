const fs = require('fs').promises;
const path = require('path');
const ConversionService = require('../services/ConversionService');
const logger = require('../utils/logger');
const { decorateMediaItem, resolveStoragePath } = require('../utils/pathUtils');

const DEFAULT_DURATION = 10000;

class MediaManager {
    constructor() {
        const defaultPath = path.join(__dirname, '../../storage/playlists');
        this.baseStoragePath = resolveStoragePath(
            process.env.RECUE_STORAGE_PATH,
            path.join(__dirname, '../../storage'),
            'playlists'
        );
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
            logger.error('MediaManager', `Error creating media storage for playlist ${playlistId}:`, error);
        }
    }

    async listMedia(playlistId) {
        try {
            if (!playlistId) return [];

            const configPath = this.getMediaConfigPath(playlistId);
            try {
                const content = await fs.readFile(configPath, 'utf-8');
                let media = JSON.parse(content);
                return media.map(m => decorateMediaItem(m, playlistId));
            } catch (e) {
                return await this.syncMedia(playlistId);
            }
        } catch (error) {
            logger.error('MediaManager', 'Error listing media:', error);
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
                // Config file doesn't exist yet, will be created
            }

            // Scan directory
            let files = [];
            try {
                files = await fs.readdir(mediaPath);
            } catch (e) {
                // Directory doesn't exist yet, will be created
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

                // Skip thumbnail files
                if (file.endsWith('_thumb.jpg')) continue;


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
            return currentMedia.map(m => decorateMediaItem(m, playlistId));

        } catch (error) {
            logger.error('MediaManager', `Error syncing media for ${playlistId}:`, error);
            return [];
        }
    }

    async saveFile(playlistId, file, metadata = {}) {
        try {
            logger.debug('MediaManager', `Saving file: ${file.filename} for playlist: ${playlistId}`);
            logger.debug('MediaManager', `Metadata: ${JSON.stringify(metadata).substring(0, 100)}...`);

            await this.ensureMediaStorage(playlistId);
            const filename = file.filename;
            const savePath = path.join(this.getMediaPath(playlistId), filename);
            const fsDirect = require('fs');
            const { pipeline } = require('stream/promises');

            const writeStream = fsDirect.createWriteStream(savePath);
            await pipeline(file.file, writeStream);

            if (file.file.truncated) {
                // Delete the partial file
                try { fsDirect.unlinkSync(savePath); } catch (e) { }
                throw new Error('File size limit reached');
            }

            // Update media.json using raw config to avoid decoration mismatch
            const rawList = await this.readRawConfig(playlistId);
            const existingIdx = rawList.findIndex(m => m.filename === filename);

            // Backend handles video processing, so ignore frontend duration/thumbnail for videos
            // But we must preserve name/type if provided
            const isVideo = metadata.type === 'video' || filename.endsWith('.mp4'); // Simple check
            const isImage = metadata.type === 'image' || ['.jpg', '.jpeg', '.png'].includes(path.extname(filename).toLowerCase());

            let thumbnailFilename = '';

            // Generate thumbnail for images
            if (isImage) {
                try {
                    const ext = path.extname(filename);
                    thumbnailFilename = filename.replace(ext, '_thumb.jpg');
                    const thumbnailPath = path.join(this.getMediaPath(playlistId), thumbnailFilename);
                    await ConversionService.generateImageThumbnail(savePath, thumbnailPath);
                    logger.info('MediaManager', `Generated image thumbnail: ${thumbnailFilename}`);
                } catch (e) {
                    logger.error('MediaManager', `Failed to generate image thumbnail: ${e.message}`);
                    thumbnailFilename = '';
                }
            }

            const newItem = {
                id: metadata.id || `file-${Date.now()}`,
                name: metadata.name || filename,
                type: metadata.type || 'unknown',
                filename: filename,
                // Use frontend duration only if NOT video (or we trust it for images)
                duration: isVideo ? DEFAULT_DURATION : (metadata.duration || DEFAULT_DURATION),
                thumbnail: isVideo ? '' : (thumbnailFilename || metadata.thumbnail || '')
            };

            if (existingIdx >= 0) {
                logger.debug('MediaManager', `Updating existing entry at index ${existingIdx}`);
                // Merge, but prefer new metadata if provided (except for video fields we want to recalc)
                rawList[existingIdx] = { ...rawList[existingIdx], ...newItem };
            } else {
                logger.debug('MediaManager', 'Adding new entry');
                rawList.push(newItem);
            }

            await this.saveRawConfig(playlistId, rawList);
            logger.info('MediaManager', 'Saved file and updated config successfully');
            return decorateMediaItem(newItem, playlistId); // Return the item for conversion tracking
        } catch (error) {
            logger.error('MediaManager', 'Error saving file:', error);
            return null;
        }
    }

    getFilePath(playlistId, filename) {
        return path.join(this.getMediaPath(playlistId), filename);
    }

    async updateMediaMetadata(playlistId, mediaId, updates) {
        try {
            const rawList = await this.readRawConfig(playlistId);
            const item = rawList.find(m => m.id === mediaId);
            if (item) {
                Object.assign(item, updates);
                await this.saveRawConfig(playlistId, rawList);
                logger.debug('MediaManager', `Updated metadata for ${mediaId}:`, Object.keys(updates));
                return true;
            }
            return false;
        } catch (error) {
            logger.error('MediaManager', `Error updating media metadata for ${mediaId}:`, error);
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
            logger.error('MediaManager', 'Error adding dynamic item:', error);
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
                    const thumbPath = filePath.replace(path.extname(filePath), '_thumb.jpg');
                    try { await fs.unlink(thumbPath); } catch (e) { }

                    logger.info('MediaManager', `Deleted file: ${filePath}`);
                } catch (err) {
                    logger.error('MediaManager', `Error deleting file ${filePath}:`, err);
                }
            }

            rawList.splice(index, 1);
            await this.saveRawConfig(playlistId, rawList);

            // Cleanup playlist.json
            const playlistModified = await this.cleanupPlaylistReferences(playlistId, item);

            return { success: true, playlistModified };
        } catch (error) {
            logger.error('MediaManager', 'Error deleting media:', error);
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
                logger.info('MediaManager', `Removed ${initialCount - playlist.items.length} items from playlist ${playlistId}`);
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
