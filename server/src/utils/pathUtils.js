const path = require('path');

/**
 * Shared utility functions for path operations and media item decoration
 */

/**
 * Decorate a media item with full server paths
 * @param {Object} item - Media item to decorate
 * @param {string} playlistId - Playlist ID for path construction
 * @returns {Object} Decorated item with full paths
 */
function decorateMediaItem(item, playlistId) {
    if (!item) return item;

    const isFile = (item.type === 'image' || item.type === 'video' || item.filename);

    return {
        ...item,
        path: isFile && item.filename ? `/media/${playlistId}/media/${item.filename}` : item.path,
        thumbnailPath: item.thumbnail && !item.thumbnail.startsWith('data:')
            ? `/media/${playlistId}/media/${item.thumbnail}`
            : item.thumbnailPath
    };
}

/**
 * Resolve storage path from environment or use default
 * @param {string} envPath - Path from environment variable (optional)
 * @param {string} defaultPath - Default path to use if env not set
 * @param {string} subPath - Optional sub-path to append (e.g., 'playlists')
 * @returns {string} Resolved storage path
 */
function resolveStoragePath(envPath, defaultPath, subPath = '') {
    const basePath = envPath || defaultPath;
    return subPath ? path.join(basePath, subPath) : basePath;
}

module.exports = {
    decorateMediaItem,
    resolveStoragePath
};
