import { createStore } from 'vuex'
import appData from './modules/appData'
import playlists from './modules/playlists'

export default createStore({
    modules: {
        appData,
        playlists
    }
})
