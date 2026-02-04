<template>
  <dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': open }">
    <div class="modal-box bg-base-100 border border-white/10 relative max-h-[80vh] flex flex-col p-0">
      <!-- Header -->
      <div class="p-4 border-b border-white/5 flex justify-between items-center bg-base-200">
        <h3 class="font-bold text-lg text-white">Select Media</h3>
        <button class="btn btn-sm btn-circle btn-ghost text-gray-400 hover:text-white" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content: Grid of items -->
      <div class="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">
        <div v-for="item in items" :key="item.id"
          class="group relative aspect-video bg-base-300 rounded-lg overflow-hidden border border-white/5 hover:border-accent hover:ring-2 hover:ring-accent transition-all cursor-pointer"
          @click="select(item)">
          <img :src="item.thumbnail"
            class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />

          <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex flex-col justify-end">
            <span class="text-xs font-semibold text-white truncate">{{ item.name }}</span>
            <div class="flex justify-between items-center text-[10px] text-gray-400 mt-0.5">
              <span class="uppercase tracking-wider">{{ item.type }}</span>
              <span>{{ formatDuration(item.duration) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action p-4 bg-base-200 m-0 border-t border-white/5">
        <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
      </div>

    </div>
    <form method="dialog" class="modal-backdrop" @click="$emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
  open: Boolean
});

const emit = defineEmits(['close', 'select']);
const store = useStore();

const items = computed(() => store.getters['appData/allLibraryItems']);

const formatDuration = (ms) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
};

const select = (item) => {
  emit('select', item);
};
</script>
