<template>
  <div class="h-full flex flex-col bg-base-100 relative">
    <div class="p-4 border-b border-white/5 flex justify-between items-center bg-base-200/50">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <input type="text" v-model="currentPlaylistName" @blur="saveName" @keyup.enter="$event.target.blur()"
          class="bg-transparent border-none text-white font-bold tracking-wide focus:ring-1 focus:ring-accent/50 rounded px-1 -ml-1 w-full max-w-md outline-none"
          placeholder="Playlist Name" />
        <button class="btn btn-xs btn-ghost btn-circle text-gray-500 hover:text-white"
          @click="showSettingsModal = true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      <div class="text-xs text-gray-400 shrink-0 ml-2">
        Total: <span class="text-accent">{{ formatDuration(totalDuration) }}</span>
      </div>
    </div>

    <PlaylistSettingsModal :open="showSettingsModal" @close="showSettingsModal = false" />

    <!-- Draggable List -->
    <draggable v-model="playlistItems" item-key="id" class="flex-1 overflow-y-auto p-2 space-y-2 pb-20"
      ghost-class="opacity-50" drag-class="scale-105" :disabled="appMode === 'play'">
      <template #item="{ element: item, index }">
        <div class="relative flex items-center p-2 rounded-lg border transition-all group select-none mb-2" :class="[
          getItemStatus(item, index) === 'active' ? 'bg-white/10 border-accent scale-[1.02] shadow-lg z-10' : '',
          getItemStatus(item, index) === 'played' ? 'bg-base-200 border-transparent opacity-50 scale-95' : 'bg-base-200 border-transparent hover:bg-base-200/80',
          isSelected(item.id) ? 'ring-1 ring-accent/50' : '',
          appMode === 'edit' ? 'cursor-move' : 'cursor-default'
        ]" @click="selectItem(item.id)">
          <!-- Edit Mode: Drag Handle / Index -->
          <span v-if="appMode === 'edit'"
            class="text-xs text-gray-500 w-8 text-center font-mono flex flex-col items-center">
            <span>{{ index + 1 }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
              stroke="currentColor" class="w-3 h-3 opacity-0 group-hover:opacity-50">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </span>

          <!-- Play Mode: Play Trigger (Only for upcoming/active) -->
          <button v-else
            class="btn btn-sm btn-circle btn-ghost text-accent hover:bg-accent/20 w-8 mr-1 transition-transform"
            :class="getItemStatus(item, index) === 'active' ? 'scale-110 bg-accent text-white hover:bg-accent' : ''"
            @click.stop="triggerItem(item)">
            <svg v-if="getItemStatus(item, index) === 'active'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd"
                d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                clip-rule="evenodd" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd"
                d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                clip-rule="evenodd" />
            </svg>
          </button>

          <!-- Thumbnail -->
          <div v-if="getItemStatus(item, index) !== 'played'"
            class="w-16 h-10 rounded overflow-hidden bg-black mr-3 relative md:w-20 md:h-12 flex-shrink-0 pointer-events-none transition-all duration-300 flex items-center justify-center">
            <img v-if="item.thumbnail"
              :src="item.thumbnail.startsWith('/') ? `http://localhost:3000${item.thumbnail}` : item.thumbnail"
              class="w-full h-full object-cover" />
            <div v-else class="text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div v-if="item.loop" class="absolute bottom-0 right-0 bg-secondary text-white text-[8px] px-1">LOOP</div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <h3 class="text-sm font-medium transition-colors truncate pr-2" :class="[
                getItemStatus(item, index) === 'active' ? 'text-white text-base' : 'text-gray-300',
                isSelected(item.id) ? 'text-accent' : ''
              ]">
                {{ item.name }}
              </h3>
              <!-- Remove Button (Edit Mode Only) -->
              <button v-if="appMode === 'edit'"
                class="btn btn-ghost btn-xs btn-circle text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="removeItem(item.id)">
                x
              </button>
            </div>

            <!-- Details (Simplified for played) -->
            <div class="flex items-center text-[10px] text-gray-500 mt-1 space-x-3 pointer-events-none"
              v-if="getItemStatus(item, index) !== 'played'">
              <span class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full" :class="getTypeColor(item.type)"></span>
                {{ item.type }}
              </span>
              <span>{{ formatDuration(item.duration) }}</span>
              <span class="bg-base-300 px-1.5 rounded text-gray-400 uppercase tracking-tighter">{{ item.transition
                }}</span>

              <!-- Status Icons -->
              <span v-if="item.loop" class="text-accent" title="Looping enabled">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                  stroke="currentColor" class="w-3 h-3">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </span>
              <span v-if="item.startMode === 'manual'" class="text-amber-500" title="Manual start required">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                  stroke="currentColor" class="w-3 h-3">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M10.05 4.57a1.125 1.125 0 0 1 1.125-1.125h2.25a1.125 1.125 0 0 1 1.125 1.125V18a1.5 1.5 0 1 1-3 0V4.57ZM6.675 6.75a1.125 1.125 0 0 1 1.125-1.125h2.25a1.125 1.125 0 0 1 1.125 1.125V18a1.5 1.5 0 1 1-3 0V6.75ZM13.425 6.75a1.125 1.125 0 0 1 1.125-1.125h2.25a1.125 1.125 0 0 1 1.125 1.125V18a1.5 1.5 0 1 1-3 0V6.75Z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </template>
    </draggable>

    <div v-if="playlistItems.length === 0"
      class="absolute inset-0 top-14 flex flex-col items-center justify-center text-gray-600 pointer-events-none">
      <div class="text-center opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="w-12 h-12 mx-auto mb-2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p class="text-lg font-medium">Playlist is empty</p>
        <p class="text-sm">Drag items from the library here</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import draggable from 'vuedraggable';
import PlaylistSettingsModal from '../modals/PlaylistSettingsModal.vue';

const store = useStore();
const showSettingsModal = ref(false);

const playlistItems = computed({
  get: () => store.getters['appData/allPlaylistItems'],
  set: (value) => store.dispatch('appData/updatePlaylist', value)
});

const totalDuration = computed(() => store.getters['appData/totalDuration']);
const selectedId = computed(() => store.state.appData.selectedItemId);
const playingItemId = computed(() => store.state.appData.playingItemId);
const appMode = computed(() => store.state.appData.appMode);

const currentPlaylistName = computed({
  get: () => store.state.playlists.currentPlaylistName,
  set: (val) => store.commit('playlists/SET_CURRENT_PLAYLIST_NAME', val)
});

const isSelected = (id) => selectedId.value === id;

const saveName = () => {
  store.dispatch('playlists/saveCurrentPlaylist', {
    id: store.state.playlists.currentPlaylistId,
    name: currentPlaylistName.value
  });
};

const getItemStatus = (item, index) => {
  // Determine if item is played, active, or upcoming
  // This assumes straightforward linear playback for now based on current playing index
  // But since we can trigger any item, we should rely on the playingItemId.
  // For 'played' status, we might need to know the playing index.

  if (playingItemId.value === item.id) return 'active';

  const playingIndex = playlistItems.value.findIndex(i => i.id === playingItemId.value);
  if (playingIndex !== -1 && index < playingIndex) return 'played';

  return 'upcoming';
};

const selectItem = (id) => {
  store.dispatch('appData/selectItem', id);
};

const triggerItem = (item) => {
  if (playingItemId.value === item.id) {
    // Pause? Or Stop?
    store.dispatch('appData/playItem', null);
  } else {
    store.dispatch('appData/playItem', item.id);
  }
};

const removeItem = (id) => {
  store.dispatch('appData/removeItem', id);
};

const formatDuration = (ms) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

const getTypeColor = (type) => {
  switch (type) {
    case 'video': return 'bg-blue-500';
    case 'image': return 'bg-green-500';
    case 'website': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}
</script>
