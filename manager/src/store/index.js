import { createStore } from 'vuex'
import appData from './modules/appData'
import playlists from './modules/playlists'
import notifications from './modules/notifications'

export default createStore({
    modules: {
        appData,
        playlists,
        notifications
    }
})
