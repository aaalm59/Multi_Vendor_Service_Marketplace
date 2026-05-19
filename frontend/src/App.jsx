import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import store from './redux/store'
import { useAuth } from './hooks/useAuth'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import BookingsPage from './pages/BookingsPage'
import InventoryPage from './pages/InventoryPage'
import BillingPage from './pages/BillingPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

// Layouts
import MainLayout from './layouts/MainLayout'

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" />
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" />
      </Router>
    </Provider>
  )
}

export default App
