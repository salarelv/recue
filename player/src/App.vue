<template>
  <div class="w-screen h-screen bg-black overflow-hidden relative">
    <MediaPlayer :item="playingItem" :volume="muted ? 0 : 1" @ended="handleMediaEnded" @timeupdate="handleTimeUpdate"
      @ready="handleMediaReady" />

    <!-- Overlay debug info -->
    <div v-if="debug" class="absolute top-0 left-0 bg-black/50 text-white text-xs p-2 font-mono">
      <div>Status: {{ status }}</div>
      <div>Playlist: {{ playlistId }}</div>
      <div>Item: {{ playingItem ? playingItem.name : 'None' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import websocket from './services/websocket';
import MediaPlayer from './components/MediaPlayer.vue';

const playlistId = ref(null);
const screenId = ref(null);
const debug = ref(false);
const muted = ref(false);
const status = ref('Disconnected');

// State
const playlistItems = ref([]);
const playingItemId = ref(null);
const playingItem = computed(() => {
  if (!playingItemId.value) return null;
  return playlistItems.value.find(i => i.id === playingItemId.value) || null;
});

// Playback Logic
const playbackTimer = ref(null);

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  playlistId.value = params.get('playlistId') || 'default';
  screenId.value = params.get('screenId') || 'screen-1';
  debug.value = params.has('debug');
  muted.value = params.get('muted') === 'true';

  websocket.init(playlistId.value);

  websocket.on('connected', () => {
    status.value = 'Connected';
  });

  websocket.on('disconnected', () => {
    status.value = 'Disconnected';
  });

  websocket.on('library:list', (items) => {
    console.log('Playlist updated:', items);
    playlistItems.value = items;
  });

  websocket.on('command', (cmd) => {
    console.log('Player Command:', cmd);
    handleCommand(cmd);
  });
});

const handleCommand = (cmd) => {
  switch (cmd.command) {
    case 'play':
      playItem(cmd.mediaId);
      break;
    case 'stop':
      stopPlayback();
      break;
    case 'next':
      playNext();
      break;
  }
};

const playItem = (id) => {
  if (playingItemId.value === id) return;

  const item = playlistItems.value.find(i => i.id === id);
  if (!item) {
    console.warn('Item not found:', id);
    return;
  }

  playingItemId.value = id;
  clearTimeout(playbackTimer.value);

  // Send status: playing
  websocket.send('player:status', {
    state: 'playing',
    itemId: id,
    playlistId: playlistId.value
  });

  if (item.type !== 'video' && item.duration) {
    startDurationTimer(item.duration);
  }
};

const stopPlayback = () => {
  playingItemId.value = null;
  clearTimeout(playbackTimer.value);
  // Send status: stopped
  websocket.send('player:status', { state: 'stopped', playlistId: playlistId.value });
};

const playNext = () => {
  const currentIdx = playlistItems.value.findIndex(i => i.id === playingItemId.value);
  if (currentIdx === -1) return;

  const nextIdx = currentIdx + 1;
  if (nextIdx < playlistItems.value.length) {
    const nextItem = playlistItems.value[nextIdx];
    playItem(nextItem.id);
  } else {
    stopPlayback();
  }
};

const handleMediaReady = (meta) => {
  websocket.send('player:ready', { itemId: playingItemId.value });
};

const handleMediaEnded = (item) => {
  console.log('Media Ended:', item.id);
  websocket.send('player:event', { event: 'ended', itemId: item.id });

  if (!item.loop) {
    playNext();
  }
};

const handleTimeUpdate = (timeData) => {
  throttleSendTime(timeData);
};

let lastTimeParams = { time: 0, ts: 0 };
const throttleSendTime = (data) => {
  const now = Date.now();
  if (now - lastTimeParams.ts > 1000) {
    websocket.send('player:time', {
      itemId: playingItemId.value,
      currentTime: data.currentTime,
      duration: data.duration
    });
    lastTimeParams = { time: data.currentTime, ts: now };
  }
};

const startDurationTimer = (seconds) => {
  clearTimeout(playbackTimer.value);
  playbackTimer.value = setTimeout(() => {
    handleMediaEnded(playingItem.value);
  }, seconds * 1000);
};

</script>

<style>
body {
  margin: 0;
  background: black;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
