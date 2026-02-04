<template>
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': open }">
        <div class="modal-box bg-base-100 border border-white/10 relative">
            <h3 class="font-bold text-lg text-white mb-4">General Settings</h3>

            <div class="form-control w-full max-w-xs">
                <label class="label">
                    <span class="label-text text-gray-400">Default Playlist Item</span>
                    <span class="label-text-alt text-gray-600">Autoplay fallback</span>
                </label>
                <select class="select select-bordered" v-model="defaultItemId">
                    <option :value="null">None (Black Screen)</option>
                    <option v-for="item in libraryItems" :key="item.id" :value="item.id">
                        {{ item.name }}
                    </option>
                </select>
            </div>

            <div class="modal-action">
                <button class="btn btn-ghost" @click="$emit('close')">Close</button>
                <button class="btn btn-primary" @click="save">Save</button>
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

const libraryItems = computed(() => store.getters['mockData/allLibraryItems']);
const currentSettings = computed(() => store.state.mockData.generalSettings);

const defaultItemId = ref(currentSettings.value.defaultItemId);

watch(() => props.open, (isOpen) => {
    if (isOpen) {
        defaultItemId.value = currentSettings.value.defaultItemId;
    }
});

const save = () => {
    store.dispatch('mockData/updateGeneralSettings', {
        defaultItemId: defaultItemId.value
    });
    emit('close');
};
</script>
