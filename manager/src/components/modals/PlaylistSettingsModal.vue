<template>
    <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            class="bg-base-200 w-full max-w-lg rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-base-300">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-6 h-6 text-accent">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Playlist Settings
                </h3>
                <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <!-- Default Media -->
                <div>
                    <label class="label text-xs uppercase text-gray-500 font-bold mb-2">Default Media</label>
                    <div v-if="localSettings.defaultMedia"
                        class="flex items-center gap-3 p-3 bg-base-300 rounded-lg border border-white/5 relative group">
                        <img :src="localSettings.defaultMedia.thumbnail" class="w-12 h-8 object-cover rounded" />
                        <div class="min-w-0 flex-1">
                            <div class="text-sm font-medium text-white truncate">{{ localSettings.defaultMedia.name }}
                            </div>
                            <div class="text-[10px] text-gray-500 uppercase">{{ localSettings.defaultMedia.type }}</div>
                        </div>
                        <button class="btn btn-xs btn-circle btn-ghost text-gray-500 hover:text-red-400"
                            @click="localSettings.defaultMedia = null">✕</button>
                    </div>
                    <button v-else
                        class="btn btn-outline btn-block btn-dashed border-white/10 text-gray-500 hover:text-white"
                        @click="showMediaSelector = true">
                        + Select Default Media
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <!-- Default Effect -->
                    <div class="form-control">
                        <label class="label text-xs uppercase text-gray-500 font-bold">Default Effect</label>
                        <select v-model="localSettings.defaultEffect"
                            class="select select-bordered bg-base-300 border-white/10 text-white focus:border-accent">
                            <option v-for="effect in availableEffects" :key="effect" :value="effect">{{
                                effect.charAt(0).toUpperCase() + effect.slice(1) }}</option>
                        </select>
                    </div>

                    <!-- Default Duration -->
                    <div class="form-control">
                        <label class="label text-xs uppercase text-gray-500 font-bold">Default Duration (ms)</label>
                        <input type="number" v-model.number="localSettings.defaultDuration"
                            class="input input-bordered bg-base-300 border-white/10 text-white focus:border-accent" />
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-white/5 bg-base-300 flex justify-end gap-3">
                <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
                <button class="btn btn-primary text-white" @click="save">Save Changes</button>
            </div>
        </div>

        <MediaSelectorModal :open="showMediaSelector" @close="showMediaSelector = false" @select="selectDefaultMedia" />
    </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { useStore } from 'vuex';
import MediaSelectorModal from './MediaSelectorModal.vue';

const props = defineProps({
    open: Boolean
});

const emit = defineEmits(['close']);

const store = useStore();
const availableEffects = computed(() => store.state.appData.availableEffects);
const currentSettings = computed(() => store.state.playlists.currentPlaylistSettings);

const showMediaSelector = ref(false);
const localSettings = reactive({
    defaultMedia: null,
    defaultEffect: 'cut',
    defaultDuration: 10000
});

watch(() => props.open, (newVal) => {
    if (newVal) {
        // Clone current settings to local state
        localSettings.defaultMedia = currentSettings.value.defaultMedia;
        localSettings.defaultEffect = currentSettings.value.defaultEffect;
        localSettings.defaultDuration = currentSettings.value.defaultDuration;
    }
});

const selectDefaultMedia = (media) => {
    localSettings.defaultMedia = {
        id: media.id,
        name: media.name,
        type: media.type,
        thumbnail: media.thumbnail
    };
    showMediaSelector.value = false;
};

const save = () => {
    store.dispatch('playlists/updatePlaylistSettings', { ...localSettings });
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
