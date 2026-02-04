import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import './style.css'
import '@fontsource/inter'

createApp(App).use(store).mount('#app')
