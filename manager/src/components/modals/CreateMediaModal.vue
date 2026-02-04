<template>
    <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': open }">
        <div class="modal-box bg-base-100 border border-white/10 relative">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="close">✕</button>

            <h3 class="font-bold text-lg text-white mb-4">Create New Media</h3>

            <!-- Step 1: Type Selection -->
            <div v-if="!selectedType" class="grid grid-cols-2 gap-4">
                <button class="btn btn-outline btn-accent h-auto py-4 flex flex-col gap-2"
                    @click="selectType('website')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-8 h-8">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 01-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    Website
                </button>
                <button class="btn btn-outline btn-error h-auto py-4 flex flex-col gap-2"
                    @click="selectType('youtube')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-8 h-8">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    YouTube Video
                </button>
                <button class="btn btn-outline btn-info h-auto py-4 flex flex-col gap-2" @click="selectType('image')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-8 h-8">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    Image (URL)
                </button>
            </div>

            <!-- Step 2: Configuration -->
            <div v-else class="space-y-4">
                <div class="flex items-center gap-2 text-sm text-gray-500 mb-4 cursor-pointer hover:text-white"
                    @click="selectedType = null">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path fill-rule="evenodd"
                            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                            clip-rule="evenodd" />
                    </svg>
                    Back to Types
                </div>

                <div class="form-control">
                    <label class="label text-xs uppercase text-gray-500 font-bold">Name</label>
                    <input type="text" v-model="formData.name" placeholder="My New Item"
                        class="input input-bordered bg-base-300 border-white/10 focus:border-accent text-white" />
                </div>

                <div class="form-control">
                    <label class="label text-xs uppercase text-gray-500 font-bold">URL</label>
                    <input type="url" v-model="formData.url" placeholder="https://..."
                        class="input input-bordered bg-base-300 border-white/10 focus:border-accent text-white" />
                </div>

                <div class="form-control" v-if="selectedType !== 'image'">
                    <label class="label text-xs uppercase text-gray-500 font-bold">Duration (s)</label>
                    <input type="number" v-model.number="formData.duration"
                        class="input input-bordered bg-base-300 border-white/10 focus:border-accent text-white" />
                </div>

                <div class="modal-action">
                    <button class="btn btn-primary w-full" @click="create" :disabled="!isValid">Create {{ selectedType
                        }}</button>
                </div>
            </div>

        </div>
        <form method="dialog" class="modal-backdrop" @click="close">
            <button>close</button>
        </form>
    </dialog>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';

const props = defineProps({
    open: Boolean
});

const emit = defineEmits(['close', 'create']);

const selectedType = ref(null);
const formData = reactive({
    name: '',
    url: '',
    duration: 10
});

watch(() => props.open, (newVal) => {
    if (!newVal) {
        // Reset on close
        setTimeout(() => {
            selectedType.value = null;
            formData.name = '';
            formData.url = '';
            formData.duration = 10;
        }, 300);
    }
});

const isValid = computed(() => {
    return formData.name.length > 0 && formData.url.length > 0;
});

const selectType = (type) => {
    selectedType.value = type;
    formData.duration = type === 'website' ? 30 : 60; // Defaults
};

const close = () => {
    emit('close');
};

const create = () => {
    const newItem = {
        name: formData.name,
        type: selectedType.value,
        url: formData.url,
        duration: formData.duration,
        // Mock thumbnail based on type
        thumbnail: selectedType.value === 'youtube'
            ? 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
            : `https://picsum.photos/seed/${Date.now()}/200/120`
    };

    emit('create', newItem);
    close();
};
</script>
