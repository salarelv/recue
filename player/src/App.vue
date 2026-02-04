<template>
  <div class="player-wrapper">
    <MediaPlayer :item="playingItem" :volume="muted ? 0 : 1" :startTime="playingItemStartTime" @ended="handleMediaEnded"
      @timeupdate="handleTimeUpdate" @ready="handleMediaReady" @error="handleMediaError" />

    <!-- Preloading Layer (Hidden) -->
    <div class="preloader">
      <!-- Preload regular items -->
      <template v-for="item in playlistItems" :key="'pre-' + item.id">
        <img v-if="item.type === 'image'" :src="resolveUrl(item.url || item.path || item.thumbnail)"
          @load="reportItemStatus(item.id, 'ready')" @error="reportItemStatus(item.id, 'error')" />
        <video v-else-if="item.type === 'video'" :src="resolveUrl(item.url || item.path)" preload="auto" muted
          @canplaythrough="reportItemStatus(item.id, 'ready')" @error="reportItemStatus(item.id, 'error')"></video>
      </template>

      <!-- Preload default media -->
      <template v-if="defaultMedia">
        <img v-if="defaultMedia.type === 'image'"
          :src="resolveUrl(defaultMedia.url || defaultMedia.path || defaultMedia.thumbnail)" />
        <video v-else-if="defaultMedia.type === 'video'" :src="resolveUrl(defaultMedia.url || defaultMedia.path)"
          preload="auto" muted></video>
      </template>
    </div>

    <!-- Overlay debug info -->
    <div v-if="debug" class="debug-overlay">
      <div>Status: {{ status }}</div>
      <div>Playlist: {{ playlistId }}</div>
      <div>Item: {{ playingItem ? playingItem.name : 'None' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import websocket from './services/websocket';
import MediaPlayer from './components/MediaPlayer.vue';

const playlistId = ref(null);
const screenId = ref(null);
const debug = ref(false);
const muted = ref(false);
const status = ref('Disconnected');

// State
const playlistItems = ref([]);
const defaultMedia = ref(null);
const playingItemId = ref(null);
const playingItemStartTime = ref(0);
const pendingCommand = ref(null);

const displayItem = computed(() => {
  if (playingItemId.value) {
    return playlistItems.value.find(i => i.id === playingItemId.value) || null;
  }
  return defaultMedia.value;
});

const playingItem = displayItem; // Keep alias for compatibility if needed, though we should update template 

// Playback Logic
const playbackTimer = ref(null);
const progressInterval = ref(null);

// Status Tracking
const itemStatuses = ref({}); // { id: 'loading' | 'ready' | 'error' }

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${window.location.origin}${url}`;
  return url;
};

const reportItemStatus = (mediaId, status) => {
  if (itemStatuses.value[mediaId] === status) return;
  itemStatuses.value[mediaId] = status;

  websocket.send(`player:${status}`, {
    playlistId: playlistId.value,
    mediaId: mediaId
  });
};

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  playlistId.value = params.get('playlistId') || 'default';
  screenId.value = params.get('screenId') || 'screen-1';
  debug.value = params.has('debug');
  muted.value = params.get('muted') === 'true';

  websocket.init(playlistId.value);

  websocket.on('connected', async () => {
    status.value = 'Connected';
    // Fetch playlist via HTTP
    try {
      const response = await fetch(`/api/playlists/${playlistId.value}`);
      if (response.ok) {
        const playlist = await response.json();
        console.log('Playlist loaded:', playlist);
        playlistItems.value = playlist.items || [];
        defaultMedia.value = playlist.settings?.defaultMedia || null;

        // Initialize statuses as loading
        playlistItems.value.forEach(item => {
          reportItemStatus(item.id, 'loading');
        });

        // Now that we have items, handle any command that came in early
        if (pendingCommand.value) {
          console.log('Handling pending command:', pendingCommand.value);
          const cmd = pendingCommand.value;
          pendingCommand.value = null; // Clear before handling
          handleCommand(cmd);
        }
      }
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
    }
  });

  websocket.on('disconnected', () => {
    status.value = 'Disconnected';
  });

  // Listen for real-time playlist updates
  websocket.on('library:list', (items) => {
    console.log('Playlist updated:', items);
    playlistItems.value = items;
    // Update statuses for new items
    items.forEach(item => {
      if (!itemStatuses.value[item.id]) {
        reportItemStatus(item.id, 'loading');
      }
    });

    // Check if we can resume a pending item after a dynamic update
    if (pendingCommand.value) {
      const cmd = pendingCommand.value;
      if (cmd.mediaId && items.some(i => i.id === cmd.mediaId)) {
        console.log('Handling pending command after update:', cmd);
        pendingCommand.value = null;
        handleCommand(cmd);
      }
    }
  });

  websocket.on('playlist:updated', async () => {
    console.log('Playlist updated on server, fetching...');
    try {
      const response = await fetch(`/api/playlists/${playlistId.value}`);
      if (response.ok) {
        const playlist = await response.json();
        playlistItems.value = playlist.items || [];
        defaultMedia.value = playlist.settings?.defaultMedia || null;
      }
    } catch (e) {
      console.error('Failed to refresh playlist:', e);
    }
  });

  websocket.on('command', (cmd) => {
    console.log('Player Command:', cmd);
    handleCommand(cmd);
  });
});

const handleCommand = (cmd) => {
  console.log('handleCommand', cmd);

  // Buffer command if items aren't ready
  if (playlistItems.value.length === 0) {
    console.log('Buffering command as playlist not ready yet');
    pendingCommand.value = cmd;
    return;
  }

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
    case 'resume':
      if (cmd.mediaId) {
        playItem(cmd.mediaId, cmd.startTime || 0);
      }
      break;
  }
};

const playItem = (id, startTime = 0) => {
  // If item failed to load, skip it
  if (itemStatuses.value[id] === 'error') {
    console.warn('Skipping item due to load error:', id);
    playNext(id); // Pass current ID to avoid infinite loops
    return;
  }

  if (playingItemId.value === id) return;

  const item = playlistItems.value.find(i => i.id === id);
  if (!item) {
    console.warn('Item not found:', id);
    return;
  }

  playingItemId.value = id;
  playingItemStartTime.value = startTime;
  clearTimeout(playbackTimer.value);
  clearInterval(progressInterval.value);

  // Send status: playing
  websocket.send('player:status', {
    status: 'playing',
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
  clearInterval(progressInterval.value);
  // Send status: stopped
  websocket.send('player:status', { status: 'stopped', playlistId: playlistId.value });
};

const playNext = (currentId = null) => {
  const cid = currentId || playingItemId.value;
  const currentIdx = playlistItems.value.findIndex(i => i.id === cid);
  if (currentIdx === -1) return;

  const nextIdx = currentIdx + 1;
  if (nextIdx < playlistItems.value.length) {
    const nextItem = playlistItems.value[nextIdx];

    // Check for cue
    if (nextItem.start === 'cue') {
      stopPlayback();
    } else {
      playItem(nextItem.id);
    }
  } else {
    stopPlayback();
  }
};

const handleMediaReady = (meta) => {
  // Item is definitely ready if it's playing
  const itemId = playingItemId.value;
  if (itemId) {
    reportItemStatus(itemId, 'ready');
  }
};

const handleMediaError = (e) => {
  const itemId = playingItemId.value;
  if (itemId) {
    const item = playlistItems.value.find(i => i.id === itemId);
    reportItemStatus(itemId, 'error');

    // Detailed error for manager notification
    websocket.send('player:error:detail', {
      itemId: itemId,
      itemName: item ? item.name : 'Unknown Item',
      error: 'Media failed to load or play'
    });

    playNext(itemId); // Skip on error
  }
}

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
      duration: data.duration,
      playlistId: playlistId.value
    });
    lastTimeParams = { time: data.currentTime, ts: now };
  }
};

const startDurationTimer = (durationMs) => {
  clearTimeout(playbackTimer.value);
  clearInterval(progressInterval.value);

  const durationSeconds = durationMs / 1000;
  let elapsed = 0;
  const startTime = Date.now();

  // Send progress updates every second for non-video items
  progressInterval.value = setInterval(() => {
    elapsed = (Date.now() - startTime) / 1000;
    websocket.send('player:time', {
      itemId: playingItemId.value,
      currentTime: elapsed,
      duration: durationSeconds,
      playlistId: playlistId.value
    });
  }, 1000);

  // End playback after duration
  playbackTimer.value = setTimeout(() => {
    clearInterval(progressInterval.value);
    handleMediaEnded(playingItem.value);
  }, durationMs);
};

</script>

<style>
body {
  margin: 0;
  background: black;
  color: white;
  font-family: sans-serif;
}

#app {
  width: 100vw;
  height: 100vh;
}

.player-wrapper {
  width: 100%;
  height: 100%;
  background: black;
  overflow: hidden;
  position: relative;
}

.preloader {
  position: absolute;
  top: -100px;
  left: -100px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0.01;
  pointer-events: none;
}

.debug-overlay {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 0.75rem;
  padding: 0.5rem;
  font-family: monospace;
  z-index: 100;
}
</style>