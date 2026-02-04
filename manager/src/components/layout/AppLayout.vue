<template>
    <div class="h-screen w-screen bg-base-300 text-gray-300 flex overflow-hidden font-sans relative">

        <!-- Mobile Backdrop -->
        <div v-if="showLibrary || showSettings"
            class="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity" @click="closeAll">
        </div>

        <!-- LEFT: Media Library -->
        <div class="fixed inset-y-0 left-0 z-30 w-80 bg-base-200 border-r border-white/5 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-[30%] lg:flex flex-col h-full"
            :class="[showLibrary ? 'translate-x-0' : '-translate-x-full', appMode === 'play' ? 'hidden lg:hidden' : '']">
            <MediaLibrary />
        </div>

        <!-- CENTER: Playlist -->
        <div class="flex-1 flex flex-col bg-base-100 z-10 shadow-xl overflow-hidden min-w-0">
            <!-- Toolbar -->
            <div class="h-14 border-b border-white/5 flex items-center px-4 justify-between bg-base-200 shrink-0">
                <div class="flex gap-2 items-center">
                    <!-- Mobile: Toggle Library -->
                    <button class="btn btn-sm btn-square btn-ghost lg:hidden" @click="showLibrary = !showLibrary"
                        v-if="appMode === 'edit'">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                    </button>

                    <button
                        class="btn btn-sm btn-ghost gap-2 px-3 border border-white/5 hover:bg-white/5 text-gray-400 hover:text-white"
                        @click="openPlaylistModal = true">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                        <span class="text-xs font-bold uppercase tracking-widest hidden sm:inline">Playlist</span>
                        <div class="badge badge-sm badge-outline border-white/20 text-[10px] opacity-60">{{
                            currentPlaylistId || '...' }}</div>
                    </button>

                    <div class="h-4 w-[1px] bg-white/10 mx-1 hidden lg:block"></div>
                </div>

                <div class="text-sm font-bold tracking-widest text-white uppercase truncate px-2">Recue Manager</div>

                <div class="flex gap-2 items-center">
                    <!-- Mobile: Toggle Settings -->
                    <button class="btn btn-sm btn-circle btn-ghost hidden md:inline-flex" title="Open Player"
                        @click="openPlayerModal = true">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                    </button>

                    <div class="join border border-white/10 rounded-lg overflow-hidden hidden md:flex">
                        <button class="join-item btn btn-sm border-0"
                            :class="appMode === 'play' ? 'btn-primary text-white' : 'btn-ghost text-gray-400'"
                            @click="setMode('play')">PLAY</button>
                        <button class="join-item btn btn-sm border-0"
                            :class="appMode === 'edit' ? 'btn-primary text-white' : 'btn-ghost text-gray-400'"
                            @click="setMode('edit')">EDIT</button>
                    </div>

                    <div class="h-4 w-[1px] bg-white/10 mx-1 hidden lg:block"></div>

                    <!-- Notifications Dropdown -->
                    <div class="dropdown dropdown-end">
                        <label tabindex="0" class="btn btn-sm btn-circle btn-ghost relative">
                            <span v-if="notifications.length > 0"
                                class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                        </label>
                        <div tabindex="0"
                            class="dropdown-content z-50 card card-compact w-72 p-2 shadow-2xl bg-base-200 border border-white/10 mt-2">
                            <div class="card-body">
                                <div class="flex justify-between items-center mb-2">
                                    <h3 class="font-bold text-xs uppercase tracking-widest text-gray-400">Notifications
                                    </h3>
                                    <button v-if="notifications.length > 0"
                                        @click="store.dispatch('notifications/clearAll')"
                                        class="btn btn-xs btn-ghost text-gray-500 hover:text-white">Clear All</button>
                                </div>
                                <div class="max-h-64 overflow-y-auto space-y-2">
                                    <div v-if="notifications.length === 0"
                                        class="py-4 text-center text-gray-500 text-xs">
                                        No new notifications
                                    </div>
                                    <div v-for="n in notifications" :key="n.id"
                                        class="p-2 rounded-lg bg-base-300 border-l-2 border-red-500 flex flex-col gap-1 relative group">
                                        <button @click="store.dispatch('notifications/remove', n.id)"
                                            class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 btn btn-xs btn-circle btn-ghost">✕</button>
                                        <span class="text-[10px] text-red-400 font-bold uppercase">{{ n.title }}</span>
                                        <p class="text-xs text-gray-300 leading-tight">{{ n.message }}</p>
                                        <span class="text-[8px] text-gray-500">{{ new
                                            Date(n.timestamp).toLocaleTimeString() }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PlaylistEditor />

            <!-- Bottom Transport -->
            <div class="h-20 border-t border-white/5 bg-base-200 flex flex-col shrink-0 safe-pb relative">
                <!-- Progress Line -->
                <div class="w-full h-1 bg-white/5 cursor-pointer group relative">
                    <div class="h-full bg-accent transition-all duration-300"
                        :style="{ width: playbackProgress + '%' }"></div>
                    <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    </div>
                </div>

                <!-- Main Content Row -->
                <div class="flex-1 flex items-center px-4 py-1.5 justify-between min-w-0 h-full overflow-hidden">
                    <!-- Left: Mini Preview -->
                    <div class="flex items-center gap-3 w-1/3 h-full min-w-0">
                        <div
                            class="h-full aspect-video max-w-[120px] bg-black rounded overflow-hidden border border-white/10 relative flex-shrink-0 flex items-center justify-center">
                            <img v-if="playingItem && playingItem.thumbnail"
                                :src="playingItem.thumbnail.startsWith('/') ? `${window.location.origin}${playingItem.thumbnail}` : playingItem.thumbnail"
                                class="w-full h-full object-cover opacity-80" />
                            <div v-else
                                class="w-full h-full flex items-center justify-center text-[10px] text-gray-600">
                                NO SIGNAL</div>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold text-white truncate">
                                {{ !playerConnected ? 'PLAYER NOT OPEN' : (playingItem ? playingItem.name : 'Ready') }}
                            </div>
                            <div class="text-sm font-mono text-accent truncate">{{ playingItem ?
                                '-' + formatDuration(Math.round((playingItem.duration / 1000) * (1 - playbackProgress /
                                    100))) : '--:--' }}</div>
                        </div>
                    </div>

                    <!-- Center: Transport Controls -->
                    <div class="flex items-center justify-center gap-4 flex-1">
                        <button class="btn btn-sm btn-circle btn-ghost"
                            :class="{ 'opacity-20 pointer-events-none': !playerConnected }" title="Previous"
                            @click="store.dispatch('appData/playPrevious')">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                class="w-5 h-5">
                                <path
                                    d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
                            </svg>
                        </button>
                        <button class="btn btn-md btn-circle shadow-lg text-white"
                            :class="[playerConnected ? 'btn-primary shadow-primary/20' : 'bg-gray-700 opacity-50 pointer-events-none']"
                            @click="togglePlay">
                            <svg v-if="isPlaying && playerConnected" xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                                <path fill-rule="evenodd"
                                    d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                                    clip-rule="evenodd" />
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                class="w-6 h-6 pl-0.5">
                                <path fill-rule="evenodd"
                                    d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                                    clip-rule="evenodd" />
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-circle btn-ghost"
                            :class="{ 'opacity-20 pointer-events-none': !playerConnected }" title="Next"
                            @click="store.dispatch('appData/playNext')">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                class="w-5 h-5">
                                <path
                                    d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.342 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.342 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.249 12 8.689v2.34L5.055 7.061z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Right: Next Item -->
                    <div class="hidden md:flex flex-col items-end w-1/3 text-right">
                        <div class="text-[10px] text-gray-500 uppercase tracking-widest">Next Up</div>
                        <div class="text-xs font-medium text-gray-300 truncate max-w-[150px]">{{ nextUpItem ?
                            nextUpItem.name : 'End of List' }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- RIGHT: Settings -->
        <div class="fixed inset-y-0 right-0 z-30 w-80 bg-base-200 border-l border-white/5 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-[30%] lg:flex flex-col h-full"
            :class="showSettings ? 'translate-x-0' : 'translate-x-full'">

            <!-- Mobile Close Button -->
            <button
                class="absolute top-2 right-2 z-10 btn btn-xs btn-circle btn-ghost lg:hidden text-white bg-black/20 hover:bg-black/40"
                @click="showSettings = false">✕</button>

            <div class="flex-1 flex flex-col min-h-0">
                <ItemSettings />
            </div>
        </div>

        <GeneralSettingsModal :open="openSettingsModal" @close="openSettingsModal = false" />
        <PlayerWindowModal :open="openPlayerModal" @close="openPlayerModal = false" />
        <PlaylistSelectorModal :open="openPlaylistModal" @close="openPlaylistModal = false" />

    </div>
</template>

<script setup>
import MediaLibrary from '../library/MediaLibrary.vue';
import PlaylistEditor from '../playlist/PlaylistEditor.vue';
import ItemSettings from '../settings/ItemSettings.vue';
import PlayerPreview from '../player/PlayerPreview.vue';
import GeneralSettingsModal from '../modals/GeneralSettingsModal.vue';
import PlayerWindowModal from '../modals/PlayerWindowModal.vue';
import PlaylistSelectorModal from '../modals/PlaylistSelectorModal.vue';
import { onMounted, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const showLibrary = ref(false);
const showSettings = ref(false);
const openSettingsModal = ref(false);
const openPlayerModal = ref(false);
const openPlaylistModal = ref(false);

const appMode = computed(() => store.state.appData.appMode);
const selectedItemId = computed(() => store.state.appData.selectedItemId);
const playingItem = computed(() => store.getters['appData/playingItem']);
const playbackProgress = computed(() => store.state.appData.playbackProgress);
const currentPlaylistId = computed(() => store.state.playlists.currentPlaylistId);
const playerConnected = computed(() => store.state.appData.playerConnected);
const notifications = computed(() => store.state.notifications.notifications);

const nextUpItem = computed(() => {
    const items = store.getters['appData/allPlaylistItems'];
    const currentIdx = items.findIndex(i => i.id === store.state.appData.playingItemId);
    if (currentIdx === -1) return null;
    return items[currentIdx + 1] || null;
});

const isPlaying = computed(() => store.getters['appData/isPlaying']);

watch(selectedItemId, (newId) => {
    if (newId) {
        showSettings.value = true;
    }
});

const setMode = (mode) => {
    store.dispatch('appData/setAppMode', mode);
};

const togglePlay = () => {
    if (isPlaying.value) {
        store.dispatch('appData/sendPlayerCommand', { command: 'stop' });
    } else {
        if (playingItem.value) {
            store.dispatch('appData/playItem', playingItem.value.id);
        } else {
            // If nothing playing, play first item
            const items = store.getters['appData/allPlaylistItems'];
            if (items.length > 0) {
                store.dispatch('appData/playItem', items[0].id);
            }
        }
    }
};

const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const closeAll = () => {
    showLibrary.value = false;
    showSettings.value = false;
};

watch(currentPlaylistId, (newId) => {
    if (newId) {
        const url = new URL(window.location);
        url.searchParams.set('playlistId', newId);
        window.history.pushState({}, '', url);
    }
});

onMounted(async () => {
    await store.dispatch('playlists/refreshPlaylists');

    // Check URL for playlistId
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('playlistId');

    if (playlistId) {
        store.dispatch('playlists/loadPlaylist', playlistId);
    } else {
        // Try to load default or first available?
        // Let's try 'default' first as per typical behavior
        store.dispatch('playlists/loadPlaylist', 'default');
    }

    store.dispatch('appData/initialize');
});
</script>

<style scoped>
.safe-pb {
    padding-bottom: env(safe-area-inset-bottom);
}
</style>
