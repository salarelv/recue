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
                                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>

                    <button class="btn btn-sm btn-circle btn-ghost hidden lg:inline-flex" title="Open Player"
                        @click="openPlayerModal = true">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-circle btn-ghost hidden lg:inline-flex" title="Settings"
                        @click="openSettingsModal = true">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>

                <div class="text-sm font-bold tracking-widest text-white uppercase truncate px-2">Recue Manager</div>

                <div class="flex gap-2 items-center">
                    <!-- Mobile: Toggle Settings -->
                    <button class="btn btn-sm btn-square btn-ghost lg:hidden" @click="showSettings = !showSettings">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                    </button>

                    <div class="join border border-white/10 rounded-lg overflow-hidden hidden lg:flex">
                        <button class="join-item btn btn-sm border-0"
                            :class="appMode === 'play' ? 'btn-primary text-white' : 'btn-ghost text-gray-400'"
                            @click="setMode('play')">PLAY</button>
                        <button class="join-item btn btn-sm border-0"
                            :class="appMode === 'edit' ? 'btn-primary text-white' : 'btn-ghost text-gray-400'"
                            @click="setMode('edit')">EDIT</button>
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

                <div class="flex-1 flex items-center px-4 justify-between min-w-0">
                    <!-- Left: Mini Preview & Controls -->
                    <div class="flex items-center gap-3 w-1/3">
                        <div
                            class="w-16 h-9 bg-black rounded overflow-hidden border border-white/10 relative flex-shrink-0">
                            <img v-if="playingItem" :src="playingItem.thumbnail"
                                class="w-full h-full object-cover opacity-80" />
                            <div v-else class="w-full h-full flex items-center justify-center text-[8px] text-gray-600">
                                NO SIGNAL</div>
                        </div>
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-white truncate">{{ playingItem ? playingItem.name :
                                'Ready' }}</div>
                            <div class="text-[10px] text-accent truncate">{{ playingItem ?
                                formatDuration(playingItem.duration) : '--:--' }}</div>
                        </div>
                    </div>

                    <!-- Center: Transport Controls -->
                    <div class="flex items-center justify-center gap-4 flex-1">
                        <button class="btn btn-sm btn-circle btn-ghost" title="Previous">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                class="w-5 h-5">
                                <path
                                    d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
                            </svg>
                        </button>
                        <button class="btn btn-md btn-circle btn-primary shadow-lg shadow-primary/20 text-white"
                            @click="togglePlay">
                            <svg v-if="isPlaying" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="currentColor" class="w-6 h-6">
                                <path fill-rule="evenodd"
                                    d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                                    clip-rule="evenodd" />
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                class="w-6 h-6">
                                <path fill-rule="evenodd"
                                    d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                                    clip-rule="evenodd" />
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-circle btn-ghost" title="Next">
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
                        <div class="text-xs font-medium text-gray-300 truncate max-w-[150px]">Sponsor Log</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- RIGHT: Settings & Preview -->
        <div class="fixed inset-y-0 right-0 z-30 w-80 bg-base-200 border-l border-white/5 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-[30%] lg:flex flex-col h-full"
            :class="showSettings ? 'translate-x-0' : 'translate-x-full'">
            <!-- Top Half: Preview -->
            <div class="h-[40%] p-4 bg-black flex items-center justify-center relative">
                <PlayerPreview />
                <button class="absolute top-2 right-2 btn btn-xs btn-circle btn-ghost lg:hidden text-white bg-black/50"
                    @click="showSettings = false">x</button>
            </div>

            <!-- Bottom Half: Settings -->
            <div class="h-[60%] border-t border-white/5 flex flex-col min-h-0">
                <ItemSettings />
            </div>
        </div>

        <GeneralSettingsModal :open="openSettingsModal" @close="openSettingsModal = false" />
        <PlayerWindowModal :open="openPlayerModal" @close="openPlayerModal = false" />

    </div>
</template>

<script setup>
import MediaLibrary from '../library/MediaLibrary.vue';
import PlaylistEditor from '../playlist/PlaylistEditor.vue';
import ItemSettings from '../settings/ItemSettings.vue';
import PlayerPreview from '../player/PlayerPreview.vue';
import GeneralSettingsModal from '../modals/GeneralSettingsModal.vue';
import PlayerWindowModal from '../modals/PlayerWindowModal.vue';
import { onMounted, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const showLibrary = ref(false);
const showSettings = ref(false);
const openSettingsModal = ref(false);
const openPlayerModal = ref(false);

const appMode = computed(() => store.state.mockData.appMode);
const selectedItemId = computed(() => store.state.mockData.selectedItemId);
const playingItem = computed(() => store.getters['mockData/playingItem']);
const playbackProgress = computed(() => store.state.mockData.playbackProgress);

const isPlaying = ref(false);

watch(selectedItemId, (newId) => {
    if (newId) {
        showSettings.value = true;
    }
});

const setMode = (mode) => {
    store.dispatch('mockData/setAppMode', mode);
};

const togglePlay = () => {
    isPlaying.value = !isPlaying.value;
    // Mock play logic
    if (isPlaying.value && !playingItem.value) {
        // If nothing playing, play first item
        const items = store.getters['mockData/allPlaylistItems'];
        if (items.length > 0) {
            store.dispatch('mockData/playItem', items[0].id);
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

onMounted(() => {
    store.dispatch('mockData/generateData');
});
</script>

<style scoped>
.safe-pb {
    padding-bottom: env(safe-area-inset-bottom);
}
</style>
