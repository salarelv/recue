<template>
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': open }">
        <div class="modal-box bg-base-100 border border-white/10 relative">
            <h3 class="font-bold text-lg text-white mb-4">Open Player Window</h3>

            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text text-gray-400">Select Screen</span>
                </label>
                <select class="select select-bordered" v-model="screenId">
                    <option value="screen-1">Display 1 (Primary)</option>
                    <option value="screen-2">Display 2 (External)</option>
                    <option value="screen-3">Display 3 (External)</option>
                </select>
            </div>

            <div class="form-control mt-4">
                <label class="label cursor-pointer justify-start gap-4">
                    <span class="label-text text-gray-400">Fullscreen</span>
                    <input type="checkbox" class="toggle toggle-primary" v-model="fullscreen" />
                </label>
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
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
    open: Boolean
});

const emit = defineEmits(['close']);
const store = useStore();

const currentSettings = computed(() => store.state.mockData.playerSettings);

const screenId = ref(currentSettings.value.screenId);
const fullscreen = ref(currentSettings.value.fullscreen);

watch(() => props.open, (isOpen) => {
    if (isOpen) {
        screenId.value = currentSettings.value.screenId;
        fullscreen.value = currentSettings.value.fullscreen;
    }
});

const openPlayer = () => {
    store.dispatch('mockData/updatePlayerSettings', {
        screenId: screenId.value,
        fullscreen: fullscreen.value
    });
    // Mock opening window
    alert(`Opening player on ${screenId.value} (Fullscreen: ${fullscreen.value})`);
    emit('close');
};
</script>
