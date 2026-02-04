<template>
  <div class="h-full flex flex-col bg-base-200 relative">
    <div class="p-4 border-b border-white/5 flex justify-between items-center">
      <h2 class="font-bold text-white tracking-wide">Media Library</h2>
      <div class="flex gap-2">
        <button class="btn btn-xs btn-outline btn-ghost" @click="resync" title="Resync from disk">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor" class="w-3 h-3">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
        <button class="btn btn-xs btn-outline btn-accent" @click="showCreateModal = true">
          + NEW
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 grid grid-cols-2 xl:grid-cols-3 gap-3 content-start" v-if="items.length"
      @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">

      <!-- Drop Overlay -->
      <div v-if="isDragging"
        class="absolute inset-0 bg-accent/20 border-2 border-accent border-dashed z-50 flex items-center justify-center pointer-events-none backdrop-blur-sm m-4 rounded-xl">
        <h3 class="text-xl font-bold text-white drop-shadow-md">Drop files to upload</h3>
      </div>

      <div v-for="item in items" :key="item.id"
        class="group relative aspect-video bg-base-300 rounded-lg overflow-hidden border border-white/5 hover:border-accent transition-all cursor-pointer"
        @click="addToPlaylist(item)">
        <div class="w-full h-full bg-black/20 flex items-center justify-center">
          <img v-if="item.thumbnail"
            :src="item.thumbnail.startsWith('/') ? `http://localhost:3000${item.thumbnail}` : item.thumbnail"
            class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
          <div v-else class="flex flex-col items-center gap-1 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
              stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex flex-col justify-end">
          <span class="text-xs font-semibold text-white truncate">{{ item.name }}</span>
          <div class="flex justify-between items-center text-[10px] text-gray-400 mt-1">
            <span class="uppercase tracking-wider">{{ item.type }}</span>
            <span>{{ formatDuration(item.duration) }}</span>
          </div>
        </div>
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button class="btn btn-xs btn-circle btn-error text-white" @click.stop="confirmDelete(item)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
              stroke="currentColor" class="w-3 h-3">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
          <button class="btn btn-xs btn-circle btn-primary text-white">
            +
          </button>
        </div>
      </div>
    </div>
    <div v-else class="flex-1 flex items-center justify-center text-gray-600" @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">

      <!-- Drop Overlay (Empty State) -->
      <div v-if="isDragging"
        class="absolute inset-0 bg-accent/20 border-2 border-accent border-dashed z-50 flex items-center justify-center pointer-events-none backdrop-blur-sm m-4 rounded-xl">
        <h3 class="text-xl font-bold text-white drop-shadow-md">Drop files to upload</h3>
      </div>

      No items. Create one or drop files to get started.
    </div>

    <CreateMediaModal :open="showCreateModal" @close="showCreateModal = false" @create="createItem"
      @upload="uploadFile" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import CreateMediaModal from '../modals/CreateMediaModal.vue';

const store = useStore();
const items = computed(() => store.getters['appData/allLibraryItems']);
const showCreateModal = ref(false);
const isDragging = ref(false);

const handleDrop = async (e) => {
  isDragging.value = false;
  const files = e.dataTransfer.files;
  if (!files.length) return;

  for (const file of files) {
    await store.dispatch('appData/uploadFile', file);
  }
};

const formatDuration = (ms) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

const addToPlaylist = (item) => {
  store.dispatch('appData/addToPlaylist', item);
};

const createItem = (item) => {
  store.dispatch('appData/addLibraryItem', item);
};

const uploadFile = (file) => {
  store.dispatch('appData/uploadFile', file);
};

const resync = () => {
  store.dispatch('appData/resyncLibrary');
};

const confirmDelete = (item) => {
  if (confirm(`Are you sure you want to delete "${item.name}"? This will also remove the file from the server.`)) {
    store.dispatch('appData/deleteLibraryItem', item.id);
  }
};
</script>
