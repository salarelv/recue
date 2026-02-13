<template>
    <div class="media-player">
        <!-- Placeholder Thumbnail (visible while main media loads) -->
        <img v-if="item" :src="resolveUrl(item.thumbnailPath || item.thumbnail)" class="placeholder-image" />

        <transition name="fade">
            <!-- Image Rendering -->
            <img v-if="item && item.type === 'image'" :key="'img-' + item.id"
                :src="resolveUrl(item.url || item.path || item.thumbnailPath || item.thumbnail)" class="main-media"
                @load="onLoaded" @error="(e) => (e.target.src = resolveUrl(item.thumbnailPath || item.thumbnail))" />

            <!-- Video Rendering -->
            <video v-else-if="item && item.type === 'video'" :key="'vid-' + item.id" ref="videoRef" class="main-media"
                :src="resolveUrl(item.url || item.path)" :loop="item.loop" autoplay playsinline crossOrigin="anonymous"
                @ended="onEnded" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" @canplay="onCanPlay"
                @error="onError"></video>

            <!-- YouTube Rendering -->
            <div v-else-if="item && item.type === 'youtube'" :key="'yt-' + item.id" class="main-media bg-black">
                <iframe ref="youtubeRef" class="youtube-iframe" :src="getYouTubeUrl(item.url)"
                    allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen @load="onYouTubeLoad"></iframe>
            </div>

            <!-- Website Rendering -->
            <div v-else-if="item && item.type === 'website'" :key="'web-' + item.id" class="main-media bg-white">
                <iframe class="w-full h-full border-none" :src="resolveUrl(item.url || item.path)"
                    @load="onLoaded"></iframe>
            </div>

            <div v-else key="fallback" class="off-air">
                <span>OFF AIR</span>
                <span class="message">{{ message }}</span>
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
    },
    startTime: {
        type: Number,
        default: 0
    },
    serverUrl: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['ended', 'timeupdate', 'ready', 'error']);

const videoRef = ref(null);
const youtubeRef = ref(null);
const message = ref('Waiting for content...');

// Track if we have already seeked to the initial start time
let hasSoughtInitial = false;

const setYouTubeVolume = (vol) => {
    if (youtubeRef.value && youtubeRef.value.contentWindow) {
        // YouTube uses 0-100 range
        youtubeRef.value.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'setVolume',
            args: [vol * 100]
        }), '*');

        // YouTube mute/unmute
        youtubeRef.value.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: vol === 0 ? 'mute' : 'unMute'
        }), '*');
    }
};

const applyVolume = () => {
    const vol = props.item?.volume ?? props.volume;

    // Regular Video
    if (videoRef.value) {
        videoRef.value.volume = vol;
    }

    // YouTube
    setYouTubeVolume(vol);
};

const onYouTubeLoad = () => {
    console.log('YouTube iframe loaded');
    applyVolume();
};

// Helper to resolve URL (handle relative paths)
const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('data:')) return url;

    // If it starts with /, it's an absolute path from the server root
    if (url.startsWith('/')) {
        return `${props.serverUrl || window.location.origin}${url}`;
    }

    // If it doesn't start with / and isn't a full URL, it's likely a relative media path
    // But without knowing the playlist ID here, we can't perfectly resolve it.
    // However, we should at least not let it be relative to the /player/ path.
    // If it looks like a filename, it might be a legacy or undecorated item.
    // We'll try to prepend the server URL anyway.
    return `${props.serverUrl || window.location.origin}/${url}`;
};

const getYouTubeUrl = (url) => {
    if (!url) return '';
    try {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        const id = match ? match[1] : '';

        if (!id) return '';

        const origin = props.serverUrl || window.location.origin;
        let embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=${(props.item?.volume ?? 1) === 0 ? 1 : 0}&controls=0&modestbranding=1&rel=0&enablejsapi=1&playsinline=1&origin=${origin}&widget_referrer=${origin}`;

        if (props.item?.loop) {
            embedUrl += `&loop=1&playlist=${id}`;
        }

        if (props.startTime > 0) {
            embedUrl += `&start=${Math.floor(props.startTime)}`;
        }
        return embedUrl;
    } catch (e) {
        return '';
    }
};

const onEnded = (e) => {
    console.log('onEnded', e, props.item)
    emit('ended', props.item);
};

const onTimeUpdate = (e) => {
    emit('timeupdate', {
        currentTime: e.target.currentTime,
        duration: e.target.duration
    });
};

const onLoadedMetadata = (e) => {
    if (props.startTime > 0 && !hasSoughtInitial) {
        console.log('Seeking to initial time:', props.startTime);
        e.target.currentTime = props.startTime;
        hasSoughtInitial = true;
    }
};

const onCanPlay = (e) => {
    console.log('Media can play:', props.item?.id);
    emit('ready', {
        duration: e.target.duration
    });
    applyVolume();
};

const onLoaded = () => {
    emit('ready', { duration: props.item?.duration || 0 });
};

const onError = (e) => {
    console.error('Media Error:', e);
    emit('error', e);
    message.value = 'Error loading media';
};

watch(() => props.item, (newItem) => {
    hasSoughtInitial = false;
    if (newItem && newItem.type === 'video' && videoRef.value) {
        console.log('Video item changed, loading and playing:', newItem.id);
        videoRef.value.load();
        videoRef.value.play().catch(e => {
            console.warn('Autoplay failed, user interaction may be required', e);
        });
    }
});

watch(() => props.volume, () => {
    applyVolume();
}, { immediate: true });

watch(() => props.item?.volume, () => {
    applyVolume();
});

</script>

<style scoped>
.media-player {
    width: 100%;
    height: 100%;
    background: black;
    position: relative;
    overflow: hidden;
}

.placeholder-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.5;
    filter: blur(8px);
}

.main-media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.youtube-iframe {
    width: 100%;
    height: 100%;
    border: none;
}

.off-air {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
    font-size: 2.25rem;
    font-weight: bold;
    letter-spacing: 0.1em;
    background: black;
}

.message {
    font-size: 0.875rem;
    margin-top: 0.5rem;
    font-weight: normal;
    opacity: 0.5;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
