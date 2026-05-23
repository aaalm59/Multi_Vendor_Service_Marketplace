import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loaded: false,
  },
  reducers: {
    setNotifications(state, action) {
      state.items = action.payload
      state.unreadCount = action.payload.filter((n) => !n.is_read).length
      state.loaded = true
    },
    prependNotification(state, action) {
      // Real-time WS push — add to front
      state.items.unshift(action.payload)
      if (!action.payload.is_read) state.unreadCount += 1
    },
    markOneRead(state, action) {
      const id = action.payload
      const n = state.items.find((x) => x.id === id)
      if (n && !n.is_read) {
        n.is_read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => { n.is_read = true })
      state.unreadCount = 0
    },
    clearRead(state) {
      state.items = state.items.filter((n) => !n.is_read)
    },
    resetNotifications(state) {
      state.items = []
      state.unreadCount = 0
      state.loaded = false
    },
  },
})

export const {
  setNotifications,
  prependNotification,
  markOneRead,
  markAllRead,
  clearRead,
  resetNotifications,
} = notificationSlice.actions

export default notificationSlice.reducer
