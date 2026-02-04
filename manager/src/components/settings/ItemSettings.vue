<template>
  <div class="h-full flex flex-col bg-base-200 border-l border-white/5 relative">
    <div class="p-4 border-b border-white/5">
      <h2 class="font-bold text-white tracking-wide">Item Settings</h2>
    </div>

    <div v-if="item" class="p-4 space-y-6 overflow-y-auto flex-1">
      <!-- Info Card - Clickable to change media -->
      <div
        class="flex items-start space-x-3 p-3 bg-base-300 rounded-lg border border-white/5 cursor-pointer hover:border-accent hover:bg-base-300/80 transition-all group relative"
        @click="showModal = true">
        <div class="relative w-16 h-10 flex-shrink-0">
          <img :src="item.thumbnail" class="w-full h-full object-cover rounded bg-black" />
          <div
            class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
              stroke="currentColor" class="w-4 h-4 text-white">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        </div>
        <div class="min-w-0">
          <div class="text-sm font-medium text-white truncate group-hover:text-accent transition-colors">{{ item.name }}
          </div>
          <div class="text-xs text-gray-500 uppercase flex items-center gap-1">
            {{ item.type }}
            <span
              class="text-[9px] bg-base-100 px-1 rounded border border-white/5 group-hover:border-accent/30">CHANGE</span>
          </div>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="space-y-4">

        <div class="form-control">
          <label class="label text-xs uppercase text-gray-500 font-bold">Duration (ms)</label>
          <input type="number" :value="item.duration" @input="update('duration', +$event.target.value)"
            class="input input-sm input-bordered bg-base-300 border-white/10 text-white focus:border-accent" />
        </div>

        <div class="form-control">
          <label class="label text-xs uppercase text-gray-500 font-bold">Transition</label>
          <select :value="item.transition" @change="update('transition', $event.target.value)"
            class="select select-sm select-bordered bg-base-300 border-white/10 text-white focus:border-accent">
            <option v-for="effect in availableEffects" :key="effect" :value="effect">
              {{ effect.charAt(0).toUpperCase() + effect.slice(1) }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-4">
            <span class="label-text text-xs uppercase text-gray-500 font-bold">Loop</span>
            <input type="checkbox" :checked="item.loop" @change="update('loop', $event.target.checked)"
              class="checkbox checkbox-sm checkbox-accent" :disabled="appMode === 'play'" />
          </label>
        </div>

        <div class="form-control">
          <label class="label text-xs uppercase text-gray-500 font-bold">Start Mode</label>
          <select :value="item.startMode || 'auto'" @change="update('startMode', $event.target.value)"
            class="select select-sm select-bordered bg-base-300 border-white/10 text-white focus:border-accent"
            :disabled="appMode === 'play'">
            <option value="auto">Auto Start</option>
            <option value="manual">Manual</option>
          </select>
        </div>

      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-gray-600 p-4 text-center">
      <div>
        <p>No item selected</p>
        <p class="text-xs mt-2">Select an item from the playlist to edit properties.</p>
      </div>
    </div>

    <MediaSelectorModal :open="showModal" @close="showModal = false" @select="replaceMedia" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import MediaSelectorModal from '../modals/MediaSelectorModal.vue';

const store = useStore();
const item = computed(() => store.getters['appData/selectedItem']);
const appMode = computed(() => store.state.appData.appMode);
const availableEffects = computed(() => store.state.appData.availableEffects);
const showModal = ref(false);

const update = (field, value) => {
  if (item.value) {
    store.dispatch('appData/updateItem', {
      id: item.value.id,
      updates: { [field]: value }
    });
  }
};

const replaceMedia = (newMedia) => {
  if (item.value) {
    // Update name, type, thumbnail, and potentially duration
    store.dispatch('appData/updateItem', {
      id: item.value.id,
      updates: {
        name: newMedia.name,
        type: newMedia.type,
        thumbnail: newMedia.thumbnail,
        duration: newMedia.duration // Reset duration to match new media default
      }
    });
    showModal.value = false;
  }
}
</script>
