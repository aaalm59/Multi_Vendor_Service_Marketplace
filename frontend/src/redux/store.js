import { createSlice, configureStore } from '@reduxjs/toolkit'
import Cookies from 'js-cookie'

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: Cookies.get('access_token') || null,
    refreshToken: Cookies.get('refresh_token') || null,
    isLoading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
    },
    setToken: (state, action) => {
      state.token = action.payload
      if (action.payload) {
        Cookies.set('access_token', action.payload)
      }
    },
    setRefreshToken: (state, action) => {
      state.refreshToken = action.payload
      if (action.payload) {
        Cookies.set('refresh_token', action.payload)
      }
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
    },
  },
})

// UI Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: 'light',
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload
    },
    setTheme: (state, action) => {
      state.theme = action.payload
    },
  },
})

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
  },
})

export const { setUser, setToken, setRefreshToken, setLoading, setError, logout } = authSlice.actions
export const { toggleSidebar, setSidebarOpen, setTheme } = uiSlice.actions

export default store
