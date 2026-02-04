import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import websocket from './services/websocket'
import './style.css'
import '@fontsource/inter'

websocket.init(store)

createApp(App).use(store).mount('#app')
