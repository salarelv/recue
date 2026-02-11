<template>
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': open }">
        <div class="modal-box bg-base-100 border border-white/10 relative">
            <h3 class="font-bold text-lg text-white mb-4">Open Player Window</h3>

            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text text-gray-400">Select Screen</span>
                </label>
                <select class="select select-bordered" v-model="screenId" :disabled="loading">
                    <template v-if="isElectron && displays.length > 0">
                        <option v-for="display in displays" :key="display.id" :value="display.id">
                            {{ display.primary ? 'Primary - ' : '' }}
                            {{ display.bounds.width }}x{{ display.bounds.height }}
                            ({{ display.id }})
                        </option>
                    </template>
                    <template v-else-if="loading">
                        <option disabled>Loading screens...</option>
                    </template>
                    <template v-else>
                        <option value="screen-1">Display 1 (Primary)</option>
                        <option value="screen-2">Display 2 (External)</option>
                        <option value="screen-3">Display 3 (External)</option>
                    </template>
                </select>
            </div>

            <div class="form-control mt-4" v-if="!isElectron">
                <label class="label cursor-pointer justify-start gap-4">
                    <span class="label-text text-gray-400">Fullscreen</span>
                    <input type="checkbox" class="toggle toggle-primary" v-model="fullscreen" />
                </label>
            </div>
            <div class="mt-4 text-xs text-gray-500" v-else>
                <p>Windows open in fullscreen/kiosk mode by default in Electron.</p>
            </div>

            <div class="modal-action">
                <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
                <button class="btn btn-primary" @click="openPlayer">Open</button>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop" @click="$emit('close')">
            <button>close</button>
        </form>
    </dialog>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
    open: Boolean
});

const emit = defineEmits(['close']);
const store = useStore();

const isElectron = computed(() => !!window.electronAPI);
const displays = ref([]);
const loading = ref(false);

const currentSettings = computed(() => store.state.appData.playerSettings);

const screenId = ref(currentSettings.value.screenId);
const fullscreen = ref(currentSettings.value.fullscreen);

// Fetch real displays if in Electron
const fetchDisplays = async () => {
    if (!isElectron.value) return;

    loading.value = true;
    try {
        const fetchedDisplays = await window.electronAPI.getDisplays();
        displays.value = fetchedDisplays;

        // If current screenId is not in fetched displays, reset to primary
        if (screenId.value && !fetchedDisplays.find(d => d.id === screenId.value)) {
            const primary = fetchedDisplays.find(d => d.primary) || fetchedDisplays[0];
            if (primary) screenId.value = primary.id;
        } else if (!screenId.value && fetchedDisplays.length > 0) {
            const primary = fetchedDisplays.find(d => d.primary) || fetchedDisplays[0];
            if (primary) screenId.value = primary.id;
        }
    } catch (err) {
        console.error('Failed to fetch displays:', err);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    if (isElectron.value) {
        fetchDisplays();
    }
});

watch(() => props.open, (isOpen) => {
    if (isOpen) {
        screenId.value = currentSettings.value.screenId;
        fullscreen.value = currentSettings.value.fullscreen;
        if (isElectron.value) {
            fetchDisplays();
        }
    }
});

const openPlayer = async () => {
    store.dispatch('appData/updatePlayerSettings', {
        screenId: screenId.value,
        fullscreen: fullscreen.value
    });

    const playlistId = store.state.playlists.currentPlaylistId || 'default';

    if (isElectron.value) {
        // Use Electron API to open native window
        await window.electronAPI.openPlayer(screenId.value, playlistId);
    } else {
        // Browser fallback
        const url = `/player/index.html?playlistId=${playlistId}&screenId=${screenId.value}`;
        const features = fullscreen.value
            ? 'width=1920,height=1080'
            : 'width=1280,height=720';
        window.open(url, 'RecuePlayer', features);
    }

    emit('close');
};
</script>
