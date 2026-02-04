<template>
    <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            class="bg-base-200 w-full max-w-lg rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-base-300">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-6 h-6 text-primary">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                    Open Playlist
                </h3>
                <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                <div v-for="playlist in playlists" :key="playlist.id" @click="selectPlaylist(playlist.id)"
                    class="group relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border border-white/5 bg-base-300/50 hover:bg-base-100 hover:border-primary/30"
                    :class="{ 'ring-2 ring-primary bg-base-100 border-transparent': playlist.id === currentPlaylistId }">
                    <div
                        class="w-12 h-12 rounded-lg bg-base-200 flex items-center justify-center shrink-0 border border-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor"
                            class="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0v11.25m0 0h13.5m0-11.25V21a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V16.5m15-13.5h-1.5m1.5 0v11.25" />
                        </svg>
                    </div>

                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-200 truncate group-hover:text-white">{{ playlist.name }}</h4>
                        <p class="text-xs text-gray-500 truncate">{{ playlist.items?.length || 0 }} items • {{
                            playlist.id }}.json</p>
                    </div>

                    <div v-if="playlist.id === currentPlaylistId"
                        class="shrink-0 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                        <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        Active
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-white/5 bg-base-300 flex justify-end gap-3">
                <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
                <button class="btn btn-primary text-white" @click="createNewPlaylist">New Playlist</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

defineProps({
    open: Boolean
});

const emit = defineEmits(['close']);

const store = useStore();
const playlists = computed(() => store.state.playlists.playlists);
const currentPlaylistId = computed(() => store.state.playlists.currentPlaylistId);

const selectPlaylist = (id) => {
    store.dispatch('playlists/loadPlaylist', id);
    emit('close');
};

const createNewPlaylist = () => {
    const id = `playlist-${Date.now()}`;
    const name = id;
    store.dispatch('playlists/saveCurrentPlaylist', { id, name });
    emit('close');
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}
</style>
