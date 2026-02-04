const API_BASE = '/api';

export default {
    async getLibrary(playlistId) {
        const response = await fetch(`${API_BASE}/library?playlistId=${playlistId}`);
        if (!response.ok) throw new Error('Failed to fetch library');
        return await response.json();
    },

    async getPlaylists() {
        const response = await fetch(`${API_BASE}/playlists`);
        if (!response.ok) throw new Error('Failed to fetch playlists');
        return await response.json();
    },

    async getPlaylist(id) {
        const response = await fetch(`${API_BASE}/playlists/${id}`);
        if (!response.ok) throw new Error('Failed to fetch playlist');
        return await response.json();
    },

    async savePlaylist(id, data) {
        const response = await fetch(`${API_BASE}/playlists/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to save playlist');
        return await response.json();
    },

    async setActivePlaylist(id) {
        const response = await fetch(`${API_BASE}/state/playlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to set active playlist');
        return await response.json();
    },

    async uploadFile(playlistId, file, metadata) {
        const formData = new FormData();
        formData.append('playlistId', playlistId);
        formData.append('metadata', JSON.stringify(metadata));
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to upload file');
        return await response.json();
    },

    async deletePlaylist(id) {
        const response = await fetch(`${API_BASE}/playlists/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete playlist');
        return await response.json();
    },
    async addLibraryItem(playlistId, item) {
        const response = await fetch(`${API_BASE}/library/item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playlistId, item })
        });
        if (!response.ok) throw new Error('Failed to add item');
        return await response.json();
    },
    async resyncLibrary(playlistId) {
        const response = await fetch(`${API_BASE}/library/resync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playlistId })
        });
        if (!response.ok) throw new Error('Failed to resync library');
        return await response.json();
    },
    async deleteLibraryItem(playlistId, mediaId) {
        const response = await fetch(`${API_BASE}/library/item?playlistId=${playlistId}&mediaId=${mediaId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete item');
        return await response.json();
    },
    async getYouTubeInfo(url) {
        const response = await fetch(`${API_BASE}/youtube/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        if (!response.ok) throw new Error('Failed to get video info');
        return await response.json();
    }
};
