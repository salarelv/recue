import api from '../../services/api';
import websocket from '../../services/websocket';

const DEFAULT_DURATION = 10000;

export default {
    namespaced: true,
    state: () => ({
        libraryItems: [],
        playlistItems: [],
        selectedItemId: null,
        appMode: 'edit', // 'edit' or 'play'
        generalSettings: {
            defaultItemId: null
        },
        playerSettings: {
            screenId: 'screen-1',
            fullscreen: true
        },
        playingItemId: null,
        playbackStatus: 'stopped', // 'playing', 'stopped'
        playbackProgress: 0, // 0 to 100
        availableEffects: ['cut', 'fade', 'crossfade'],
        itemStatuses: {}, // { mediaId: 'loading' | 'ready' | 'error' }
        playerConnected: false
    }),
    getters: {
        allLibraryItems: state => state.libraryItems,
        allPlaylistItems: state => state.playlistItems,
        selectedItem: state => state.playlistItems.find(item => item.id === state.selectedItemId),
        playingItem: state => state.playlistItems.find(item => item.id === state.playingItemId),
        isPlaying: state => state.playbackStatus === 'playing',
        totalDuration: state => state.playlistItems.reduce((acc, item) => acc + item.duration, 0)
    },
    actions: {
        async initialize({ dispatch, rootState }) {
            const playlistId = rootState.playlists.currentPlaylistId;
            if (!playlistId) return; // Wait for playlist selection

            try {
                // Fetch library via API
                const media = await api.getLibrary(playlistId);
                dispatch('setLibrary', media);
            } catch (e) {
                console.error("Failed to init library", e);
            }
        },
        async savePlaylist({ state, rootState }) {
            const playlistId = rootState.playlists.currentPlaylistId || 'default';
            try {
                await api.savePlaylist(playlistId, {
                    id: playlistId,
                    name: 'Current Playlist', // Could be dynamic
                    items: state.playlistItems
                });
            } catch (e) {
                console.error("Failed to save playlist", e);
            }
        },
        addToPlaylist({ commit, dispatch, rootState }, item) {
            const defaults = rootState.playlists.currentPlaylistSettings;
            commit('ADD_TO_PLAYLIST', {
                ...item,
                id: `pl-${Date.now()}`,
                mediaId: item.id, // Store the original library ID
                duration: defaults.defaultDuration || item.duration,
                transition: defaults.defaultEffect || 'cut',
                volume: 1.0
            });
            dispatch('savePlaylist');
        },
        selectItem({ commit }, id) {
            commit('SET_SELECTED', id);
        },
        updateItem({ commit, dispatch }, { id, updates }) {
            commit('UPDATE_ITEM', { id, updates });
            dispatch('savePlaylist');
        },
        removeItem({ commit, dispatch }, id) {
            commit('REMOVE_ITEM', id);
            dispatch('savePlaylist');
        },
        updatePlaylist({ commit, dispatch }, items) {
            commit('SET_PLAYLIST', items);
            dispatch('savePlaylist');
        },
        setAppMode({ commit }, mode) {
            commit('SET_APP_MODE', mode);
        },
        updateGeneralSettings({ commit }, settings) {
            commit('UPDATE_GENERAL_SETTINGS', settings);
        },
        updatePlayerSettings({ commit }, settings) {
            commit('UPDATE_PLAYER_SETTINGS', settings);
        },
        playItem({ commit }, id) {
            commit('SET_PLAYING_ITEM', id);
            websocket.send('command:player', { command: 'play', mediaId: id });
        },
        sendPlayerCommand(_, { command, args = {} }) {
            websocket.send('command:player', { command, ...args });
        },
        updateProgress({ commit }, progress) {
            commit('SET_PLAYBACK_PROGRESS', progress);
        },
        playNext({ dispatch, state }) {
            const currentIdx = state.playlistItems.findIndex(i => i.id === state.playingItemId);
            const nextIdx = currentIdx + 1;
            if (nextIdx < state.playlistItems.length) {
                dispatch('playItem', state.playlistItems[nextIdx].id);
            }
        },
        playPrevious({ dispatch, state }) {
            const currentIdx = state.playlistItems.findIndex(i => i.id === state.playingItemId);
            const prevIdx = currentIdx - 1;
            if (prevIdx >= 0) {
                dispatch('playItem', state.playlistItems[prevIdx].id);
            }
        },
        async uploadFile({ dispatch, rootState }, file) {
            const playlistId = rootState.playlists.currentPlaylistId;
            if (!playlistId) {
                console.error("No playlist selected");
                return;
            }

            // Generate metadata (thumbnail, duration)
            const metadata = {
                name: file.name,
                type: 'unknown',
                thumbnail: '',
                duration: DEFAULT_DURATION
            };

            try {
                if (file.type.startsWith('image/')) {
                    metadata.type = 'image';
                    metadata.duration = DEFAULT_DURATION;
                    metadata.thumbnail = await generateImageThumbnail(file);
                } else if (file.type.startsWith('video/')) {
                    metadata.type = 'video';
                    const videoMeta = await generateVideoThumbnail(file);
                    metadata.thumbnail = videoMeta.thumbnail;
                    metadata.duration = videoMeta.duration;
                }
            } catch (e) {
                console.warn("Failed to generate thumbnail/meta", e);
            }

            try {
                await api.uploadFile(playlistId, file, metadata);
                // Library update should come via WebSocket
            } catch (error) {
                console.error('Upload failed:', error);
            }
        },
        async addLibraryItem({ commit, rootState }, item) {
            const playlistId = rootState.playlists.currentPlaylistId;
            if (!playlistId) return;

            try {
                await api.addLibraryItem(playlistId, {
                    ...item,
                    // Generate ID here or let server? Server logic used item.id if present.
                });
                // Update comes via socket
            } catch (e) {
                console.error("Failed to add library item", e);
            }
        },
        async resyncLibrary({ rootState }) {
            const playlistId = rootState.playlists.currentPlaylistId;
            if (!playlistId) return;

            try {
                await api.resyncLibrary(playlistId);
            } catch (e) {
                console.error("Failed to resync library", e);
            }
        },
        async deleteLibraryItem({ rootState }, mediaId) {
            const playlistId = rootState.playlists.currentPlaylistId;
            if (!playlistId) return;

            try {
                await api.deleteLibraryItem(playlistId, mediaId);
            } catch (e) {
                console.error("Failed to delete library item", e);
            }
        },
        setLibrary({ commit }, items) {
            commit('SET_LIBRARY', items);
        }
    },
    mutations: {
        SET_LIBRARY(state, items) {
            state.libraryItems = items;
        },
        SET_PLAYLIST(state, items) {
            state.playlistItems = items;
        },
        ADD_TO_PLAYLIST(state, item) {
            state.playlistItems.push(item);
        },
        SET_SELECTED(state, id) {
            state.selectedItemId = id;
        },
        UPDATE_ITEM(state, { id, updates }) {
            const index = state.playlistItems.findIndex(i => i.id === id);
            if (index !== -1) {
                state.playlistItems[index] = { ...state.playlistItems[index], ...updates };
            }
        },
        REMOVE_ITEM(state, id) {
            state.playlistItems = state.playlistItems.filter(i => i.id !== id);
            if (state.selectedItemId === id) {
                state.selectedItemId = null;
            }
        },
        SET_APP_MODE(state, mode) {
            state.appMode = mode;
        },
        UPDATE_GENERAL_SETTINGS(state, settings) {
            state.generalSettings = { ...state.generalSettings, ...settings };
        },
        UPDATE_PLAYER_SETTINGS(state, settings) {
            state.playerSettings = { ...state.playerSettings, ...settings };
        },
        SET_PLAYING_ITEM(state, id) {
            state.playingItemId = id;
            state.playbackProgress = 0; // Reset progress on new item
        },
        SET_PLAYBACK_PROGRESS(state, progress) {
            state.playbackProgress = progress;
        },
        ADD_LIBRARY_ITEM(state, item) {
            state.libraryItems.unshift(item);
        },
        SET_ITEM_STATUSES(state, statuses) {
            state.itemStatuses = statuses;
        },
        SET_PLAYER_CONNECTED(state, connected) {
            state.playerConnected = connected;
        },
        SET_PLAYER_STATUS(state, status) {
            state.playbackStatus = status;
        }
    }
}

const generateImageThumbnail = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Resize to max 64px height/width while keeping aspect ratio
                const scale = Math.min(64 / img.width, 64 / img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.currentTime = 1; // Capture at 1s

        video.onloadeddata = () => {
            video.currentTime = Math.min(1, video.duration);
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = Math.min(64 / video.videoWidth, 64 / video.videoHeight);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const duration = video.duration;
            const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

            URL.revokeObjectURL(video.src);
            resolve({ thumbnail, duration: duration * 1000 }); // Return in ms
        };

        video.onerror = () => {
            resolve({ thumbnail: '', duration: 0 });
        };
    });
};
