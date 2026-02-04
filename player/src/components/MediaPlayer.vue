<template>
    <div class="media-player w-full h-full bg-black flex items-center justify-center overflow-hidden">
        <transition name="fade" mode="out-in">

            <!-- Image Rendering -->
            <img v-if="item && item.type === 'image'" :key="item.id" :src="resolveUrl(item.url || item.thumbnail)"
                class="w-full h-full object-contain" @load="onCreate" />

            <!-- Video Rendering -->
            <video v-else-if="item && item.type === 'video'" :key="item.id" ref="videoRef"
                class="w-full h-full object-contain" :src="resolveUrl(item.url)" :loop="item.loop" autoplay
                @ended="onEnded" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" @error="onError"></video>

            <!-- Fallback / Off Air -->
            <div v-else key="fallback"
                class="text-white/20 text-4xl font-bold tracking-widest flex flex-col items-center">
                <span>OFF AIR</span>
                <span class="text-sm mt-2 font-normal opacity-50">{{ message }}</span>
            </div>

        </transition>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    item: {
        type: Object,
        default: null
    },
    volume: {
        type: Number,
        default: 1
    }
});

const emit = defineEmits(['ended', 'timeupdate', 'ready', 'error']);

const videoRef = ref(null);
const message = ref('Waiting for content...');

// Helper to resolve URL (handle relative paths)
const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) {
        return `http://localhost:3000${url}`;
    }
    return url;
};

const onEnded = () => {
    emit('ended', props.item);
};

const onTimeUpdate = (e) => {
    emit('timeupdate', {
        currentTime: e.target.currentTime,
        duration: e.target.duration
    });
};

const onLoadedMetadata = (e) => {
    emit('ready', {
        duration: e.target.duration
    });
    // Set volume
    if (e.target) {
        e.target.volume = props.volume;
    }
};

const onCreate = () => {
    emit('ready', { duration: props.item.duration || 0 });
};

const onError = (e) => {
    console.error('Media Error:', e);
    emit('error', e);
    message.value = 'Error loading media';
};

watch(() => props.volume, (newVol) => {
    if (videoRef.value) {
        videoRef.value.volume = newVol;
    }
}, { immediate: true });

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
