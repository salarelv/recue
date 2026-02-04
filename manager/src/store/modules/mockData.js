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
        playbackProgress: 0 // 0 to 100
    }),
    getters: {
        allLibraryItems: state => state.libraryItems,
        allPlaylistItems: state => state.playlistItems,
        selectedItem: state => state.playlistItems.find(item => item.id === state.selectedItemId),
        playingItem: state => state.playlistItems.find(item => item.id === state.playingItemId),
        totalDuration: state => state.playlistItems.reduce((acc, item) => acc + item.duration, 0)
    },
    actions: {
        generateData({ commit }) {
            const types = ['video', 'image', 'website'];
            const names = ['Intro', 'Main Loop', 'Sponsor Log', 'Event Schedule', 'Background Anim', 'Countdown'];

            const library = Array.from({ length: 12 }).map((_, i) => ({
                id: `lib-${i}`,
                name: `${names[Math.floor(Math.random() * names.length)]} ${i + 1}`,
                type: types[Math.floor(Math.random() * types.length)],
                duration: Math.floor(Math.random() * 60) + 5,
                thumbnail: `https://picsum.photos/seed/${i}/200/120`
            }));

            const playlist = Array.from({ length: 5 }).map((_, i) => ({
                id: `pl-${i}`,
                name: `${names[Math.floor(Math.random() * names.length)]} ${i + 1}`,
                type: types[Math.floor(Math.random() * types.length)],
                duration: Math.floor(Math.random() * 60) + 5,
                transition: 'cut',
                loop: false,
                thumbnail: `https://picsum.photos/seed/${i + 100}/200/120`
            }));

            commit('SET_LIBRARY', library);
            commit('SET_PLAYLIST', playlist);
        },
        addToPlaylist({ commit }, item) {
            commit('ADD_TO_PLAYLIST', { ...item, id: `pl-${Date.now()}` });
        },
        selectItem({ commit }, id) {
            commit('SET_SELECTED', id);
        },
        updateItem({ commit }, { id, updates }) {
            commit('UPDATE_ITEM', { id, updates });
        },
        removeItem({ commit }, id) {
            commit('REMOVE_ITEM', id);
        },
        updatePlaylist({ commit }, items) {
            commit('SET_PLAYLIST', items);
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
        },
        updateProgress({ commit }, progress) {
            commit('SET_PLAYBACK_PROGRESS', progress);
        },
        addLibraryItem({ commit }, item) {
            // Generate a fake ID
            const newItem = {
                ...item,
                id: `lib-${Date.now()}`
            };
            commit('ADD_LIBRARY_ITEM', newItem);
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
        }
    }
}
