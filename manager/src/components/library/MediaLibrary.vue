<template>
  <div class="h-full flex flex-col bg-base-200 relative">
    <div class="p-4 border-b border-white/5 flex justify-between items-center">
      <h2 class="font-bold text-white tracking-wide">Media Library</h2>
      <button class="btn btn-xs btn-outline btn-accent" @click="showCreateModal = true">
        + NEW
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 grid grid-cols-2 xl:grid-cols-3 gap-3" v-if="items.length">
      <div v-for="item in items" :key="item.id"
        class="group relative aspect-video bg-base-300 rounded-lg overflow-hidden border border-white/5 hover:border-accent transition-all cursor-pointer"
        @click="addToPlaylist(item)">
        <img :src="item.thumbnail"
          class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex flex-col justify-end">
          <span class="text-xs font-semibold text-white truncate">{{ item.name }}</span>
          <div class="flex justify-between items-center text-[10px] text-gray-400 mt-1">
            <span class="uppercase tracking-wider">{{ item.type }}</span>
            <span>{{ formatDuration(item.duration) }}</span>
          </div>
        </div>
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn btn-xs btn-circle btn-primary text-white">
            +
          </button>
        </div>
      </div>
    </div>
    <div v-else class="flex-1 flex items-center justify-center text-gray-600">
      No items. Create one to get started.
    </div>

    <CreateMediaModal :open="showCreateModal" @close="showCreateModal = false" @create="createItem" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import CreateMediaModal from '../modals/CreateMediaModal.vue';

const store = useStore();
const items = computed(() => store.getters['mockData/allLibraryItems']);
const showCreateModal = ref(false);

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const addToPlaylist = (item) => {
  store.dispatch('mockData/addToPlaylist', item);
};

const createItem = (item) => {
  store.dispatch('mockData/addLibraryItem', item);
};
</script>
