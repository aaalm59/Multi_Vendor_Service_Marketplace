import axios from 'axios'
import Cookies from 'js-cookie'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Let axios set Content-Type + boundary automatically for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = Cookies.get('refresh_token')
      const originalRequest = error.config
      if (refresh && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
          Cookies.set('access_token', response.data.access)
          if (response.data.refresh) {
            Cookies.set('refresh_token', response.data.refresh)
          }
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          Cookies.remove('refresh_token')
        }
      }
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
