export default {
    namespaced: true,
    state: () => ({
        notifications: []
    }),
    mutations: {
        ADD_NOTIFICATION(state, notification) {
            state.notifications.unshift(notification);
        },
        REMOVE_NOTIFICATION(state, id) {
            state.notifications = state.notifications.filter(n => n.id !== id);
        },
        CLEAR_ALL(state) {
            state.notifications = [];
        }
    },
    actions: {
        add({ commit }, notification) {
            commit('ADD_NOTIFICATION', notification);
        },
        remove({ commit }, id) {
            commit('REMOVE_NOTIFICATION', id);
        },
        clearAll({ commit }) {
            commit('CLEAR_ALL');
        }
    }
}
