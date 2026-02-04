import websocket from '../../services/websocket';
import api from '../../services/api';

export default {
    namespaced: true,
    state: () => ({
        playlists: [],
        currentPlaylistId: null,
        currentPlaylistName: '',
        currentPlaylistSettings: {
            defaultMedia: null,
            defaultEffect: 'cut',
            defaultDuration: 10000
        }
    }),
    mutations: {
        SET_PLAYLISTS(state, playlists) {
            state.playlists = playlists;
        },
        SET_ACTIVE_PLAYLIST_ID(state, id) {
            state.currentPlaylistId = id;
        },
        SET_CURRENT_PLAYLIST_NAME(state, name) {
            state.currentPlaylistName = name;
        },
        SET_CURRENT_PLAYLIST_SETTINGS(state, settings) {
            state.currentPlaylistSettings = {
                defaultMedia: settings?.defaultMedia || null,
                defaultEffect: settings?.defaultEffect || 'cut',
                defaultDuration: settings?.defaultDuration || 10000
            };
        }
    },
    actions: {
        async loadPlaylist({ commit, rootState, dispatch }, id) {
            try {
                const currentId = rootState.playlists.currentPlaylistId;
                if (currentId) {
                    websocket.unsubscribe(`playlist:${currentId}`);
                }

                const playlist = await api.getPlaylist(id);
                commit('SET_ACTIVE_PLAYLIST_ID', id);
                commit('SET_CURRENT_PLAYLIST_NAME', playlist.name || id);
                commit('SET_CURRENT_PLAYLIST_SETTINGS', playlist.settings);
                commit('appData/SET_PLAYLIST', playlist.items, { root: true });

                websocket.subscribe(`playlist:${id}`);

                // Set active on server
                await api.setActivePlaylist(id);

                // Also load library (as updates might come through this channel now)
                dispatch('appData/initialize', null, { root: true });

            } catch (e) {
                console.error("Failed to load playlist", e);
            }
        },
        async refreshPlaylists({ commit, state }) {
            try {
                const playlists = await api.getPlaylists();
                commit('SET_PLAYLISTS', playlists);

                // If active playlist exists, reload its items
                if (state.currentPlaylistId) {
                    const playlist = await api.getPlaylist(state.currentPlaylistId);
                    commit('SET_CURRENT_PLAYLIST_NAME', playlist.name || state.currentPlaylistId);
                    commit('SET_CURRENT_PLAYLIST_SETTINGS', playlist.settings);
                    commit('appData/SET_PLAYLIST', playlist.items, { root: true });
                }
            } catch (e) {
                console.error("Failed to refresh playlists", e);
            }
        },
        async saveCurrentPlaylist({ state, rootState }) {
            try {
                await api.savePlaylist(state.currentPlaylistId, {
                    id: state.currentPlaylistId,
                    name: state.currentPlaylistName,
                    settings: state.currentPlaylistSettings,
                    items: rootState.appData.playlistItems
                });
            } catch (e) {
                console.error("Failed to save playlist", e);
            }
        },
        async updatePlaylistSettings({ commit, dispatch }, settings) {
            commit('SET_CURRENT_PLAYLIST_SETTINGS', settings);
            dispatch('saveCurrentPlaylist');
        }
    }
}
