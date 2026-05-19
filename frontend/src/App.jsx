import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useDispatch } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import store, { setUser } from './redux/store'
import { useAuth } from './hooks/useAuth'
import { authAPI } from './services/api'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import BookingsPage from './pages/BookingsPage'
import InventoryPage from './pages/InventoryPage'
import BillingPage from './pages/BillingPage'
import ReportsPage from './pages/ReportsPage'
import StaffPage from './pages/StaffPage'
import TechniciansPage from './pages/TechniciansPage'
import SuppliersPage from './pages/SuppliersPage'
import ExpensesPage from './pages/ExpensesPage'
import ServicesPage from './pages/ServicesPage'
import SettingsPage from './pages/SettingsPage'
import AdminUsersPage from './pages/admin/UsersPage'
import ManagerPermissionsPage from './pages/admin/ManagerPermissionsPage'
import TechnicianJobsPage from './technician/TechnicianJobsPage'
import { canAccess, firstRouteForRole, navItems, ROLES } from './routes/rbac'

// Layouts
import MainLayout from './layouts/MainLayout'

const ProtectedRoute = ({ children, roles }) => {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" />
  if (roles?.length && !user) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">Loading permissions...</div>
  }
  if (roles?.length && user?.role && !canAccess(user, roles)) {
    return <Navigate to={firstRouteForRole(user)} />
  }
  return children
}

const AuthBootstrap = () => {
  const dispatch = useDispatch()
  const { token, user } = useAuth()

  useEffect(() => {
    if (!token || user) return
    authAPI.getCurrentUser()
      .then((response) => dispatch(setUser(response.data)))
      .catch(() => {})
  }, [dispatch, token, user])

  return null
}

const AppRoutes = () => {
  const routeRoles = Object.fromEntries(navItems.map((item) => [item.path, item.roles]))

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
                <Route path="/dashboard" element={<ProtectedRoute roles={routeRoles['/dashboard']}><DashboardPage /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute roles={routeRoles['/customers']}><CustomersPage /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute roles={routeRoles['/bookings']}><BookingsPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute roles={routeRoles['/services']}><ServicesPage /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute roles={routeRoles['/inventory']}><InventoryPage /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute roles={routeRoles['/billing']}><BillingPage /></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute roles={routeRoles['/staff']}><StaffPage /></ProtectedRoute>} />
                <Route path="/technicians" element={<ProtectedRoute roles={routeRoles['/technicians']}><TechniciansPage /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute roles={routeRoles['/suppliers']}><SuppliersPage /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute roles={routeRoles['/expenses']}><ExpensesPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute roles={routeRoles['/reports']}><ReportsPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/manager-permissions" element={<ProtectedRoute roles={[ROLES.ADMIN]}><ManagerPermissionsPage /></ProtectedRoute>} />
                <Route path="/technician/jobs" element={<ProtectedRoute roles={[ROLES.TECHNICIAN]}><TechnicianJobsPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute roles={routeRoles['/settings']}><SettingsPage /></ProtectedRoute>} />
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
        <AuthBootstrap />
        <AppRoutes />
        <Toaster position="top-right" />
      </Router>
    </Provider>
  )
}

export default App
