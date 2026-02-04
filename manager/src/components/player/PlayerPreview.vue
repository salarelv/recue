<template>
  <div class="bg-black aspect-video rounded-lg overflow-hidden relative shadow-2xl border border-white/10 group">

    <!-- Iframe Player -->
    <iframe v-if="playlistId" :src="playerUrl" class="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>

    <!-- Loading / No Playlist State -->
    <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-base-300">
      <div class="text-xl opacity-50">Select a playlist</div>
    </div>

    <!-- Live Badge -->
    <div class="absolute top-4 right-4 flex items-center gap-2 pointer-events-none">
      <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
      <span class="text-[10px] font-bold text-red-500 tracking-wider">PREVIEW</span>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

const playlistId = computed(() => store.state.playlists.currentPlaylistId);

const playerUrl = computed(() => {
  if (!playlistId.value) return '';
  // Use absolute URL to player app
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  // Assuming port 3000 is where the server/player is served (or same origin if proxied)
  // During dev, manager is 3000, server is 3000? 
  // User says: Page B9A40619A82111570D75B148FB10EB7F (Browser) - http://localhost:39191/
  // Page 029D8AFC0499C10846ED9B126F3B8005 (Vite App) - http://localhost:3000/manager/?playlistId=default

  // The server implementation serves /player under /player prefix.
  // So we can just use /player/index.html

  return `/player/index.html?playlistId=${playlistId.value}&preview=true&muted=true`;
});

</script>
