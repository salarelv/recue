<template>
    <div :class="['relative overflow-hidden flex items-center justify-center bg-black', containerClass]">
        <img ref="imgRef" :key="thumbnailUrl" :src="thumbnailUrl" v-show="hasThumbnail"
            :class="['w-full h-full object-cover transition-opacity duration-300', imgClass, { 'opacity-0': loading }]"
            @load="handleLoad" @error="handleError" />

        <!-- Fallback / Loading State -->
        <div v-if="loading || !hasThumbnail || error"
            class="absolute inset-0 flex items-center justify-center text-gray-600 bg-base-300">
            <svg v-if="!hasThumbnail || error" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke-width="1.5" stroke="currentColor" class="w-1/2 h-1/2 opacity-20">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <span v-else-if="loading" class="loading loading-spinner loading-xs opacity-20"></span>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import { getThumbnailUrl } from '../../utils/url';

const props = defineProps({
    item: Object,
    containerClass: String,
    imgClass: String
});

const loading = ref(false);
const error = ref(false);
const imgRef = ref(null);

const thumbnailUrl = computed(() => {
    if (!props.item) return '';
    return getThumbnailUrl(props.item);
});

const hasThumbnail = computed(() => !!thumbnailUrl.value);

const handleError = () => {
    error.value = true;
    loading.value = false;
};

const handleLoad = () => {
    loading.value = false;
};

watch(() => props.item, async (newItem) => {
    error.value = false;
    const hasUrl = !!(newItem && (newItem.thumbnail || newItem.thumbnailPath));

    if (hasUrl) {
        // Only set loading to true if it's actually different or we don't have a ref yet
        // This prevents flickering when item properties change but URL doesn't
        if (!imgRef.value || imgRef.value.src !== thumbnailUrl.value) {
            loading.value = true;
        }

        // Wait for DOM update and check if browser already loaded it from cache
        await nextTick();
        if (imgRef.value && imgRef.value.complete) {
            loading.value = false;
        }
    } else {
        loading.value = false;
    }
}, { deep: true, immediate: true });
</script>
