<template>
  <div class="h-full flex flex-col bg-base-100">
    <div class="p-4 border-b border-white/5 flex justify-between items-center bg-base-200/50">
      <h2 class="font-bold text-white tracking-wide">Playlist</h2>
      <div class="text-xs text-gray-400">
        Total: <span class="text-accent">{{ formatDuration(totalDuration) }}</span>
      </div>
    </div>

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

          <!-- Thumbnail (Hidden for played items to save space, unless hover) -->
          <div v-if="getItemStatus(item, index) !== 'played'"
            class="w-16 h-10 rounded overflow-hidden bg-black mr-3 relative md:w-20 md:h-12 flex-shrink-0 pointer-events-none transition-all duration-300">
            <img :src="item.thumbnail" class="w-full h-full object-cover" />
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
              <span class="bg-base-300 px-1.5 rounded text-gray-400">{{ item.transition }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div v-if="playlistItems.length === 0"
          class="h-32 flex flex-col items-center justify-center text-gray-600 opacity-50">
          <p>Playlist is empty</p>
          <p class="text-xs">Select items from library</p>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import draggable from 'vuedraggable';

const store = useStore();

const playlistItems = computed({
  get: () => store.getters['mockData/allPlaylistItems'],
  set: (value) => store.dispatch('mockData/updatePlaylist', value)
});

const totalDuration = computed(() => store.getters['mockData/totalDuration']);
const selectedId = computed(() => store.state.mockData.selectedItemId);
const playingItemId = computed(() => store.state.mockData.playingItemId);
const appMode = computed(() => store.state.mockData.appMode);

const isSelected = (id) => selectedId.value === id;

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
  store.dispatch('mockData/selectItem', id);
};

const triggerItem = (item) => {
  if (playingItemId.value === item.id) {
    // Pause? Or Stop?
    store.dispatch('mockData/playItem', null);
  } else {
    store.dispatch('mockData/playItem', item.id);
  }
};

const removeItem = (id) => {
  store.dispatch('mockData/removeItem', id);
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
