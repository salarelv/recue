<template>
  <div class="bg-black aspect-video rounded-lg overflow-hidden relative shadow-2xl border border-white/10 group">
    
    <div v-if="item" class="w-full h-full relative">
       <img :src="item.thumbnail" class="w-full h-full object-cover" />
       
       <!-- Overlay to simulate player UI -->
       <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
          <div>
            <h3 class="text-white font-bold">{{ item.name }}</h3>
             <div class="text-xs text-secondary">00:00 / {{ formatDuration(item.duration) }}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-circle btn-sm btn-ghost text-white">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
            </button>
            <button class="btn btn-circle btn-sm btn-white text-black">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
            </button>
             <button class="btn btn-circle btn-sm btn-ghost text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </button>
          </div>
       </div>

    </div>
    
    <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-base-300">
       <div class="text-4xl opacity-20 font-black tracking-widest">OFF AIR</div>
    </div>

    <!-- Live Badge -->
    <div class="absolute top-4 right-4 flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
        <span class="text-[10px] font-bold text-red-500 tracking-wider">PREVIEW</span>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
// For preview, we just show the selected item or the first item
const item = computed(() => store.getters['mockData/selectedItem'] || store.getters['mockData/allPlaylistItems'][0]);

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>
