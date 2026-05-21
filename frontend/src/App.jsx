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
import ShopsPage from './pages/admin/ShopsPage'
import ShopSetupPage from './pages/ShopSetupPage'
import ManagerPermissionsPage from './pages/admin/ManagerPermissionsPage'
import ActivityLogsPage from './pages/admin/ActivityLogsPage'
import TechnicianJobsPage from './technician/TechnicianJobsPage'
import CustomerInvoicesPage from './pages/customer/CustomerInvoicesPage'
import { canAccess, firstRouteForRole, navItems, ROLES } from './routes/rbac'
import { CallProvider } from './context/CallContext'

// Layouts
import MainLayout from './layouts/MainLayout'

const ProtectedRoute = ({ children, roles, module }) => {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" />
  if (roles?.length && !user) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm font-semibold text-gray-600">Loading permissions...</div>
  }
  if (roles?.length && user?.role && !canAccess(user, roles, module)) {
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
  const routeModules = Object.fromEntries(navItems.map((item) => [item.path, item.module]))

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
                <Route path="/dashboard" element={<ProtectedRoute roles={routeRoles['/dashboard']} module={routeModules['/dashboard']}><DashboardPage /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute roles={routeRoles['/customers']} module={routeModules['/customers']}><CustomersPage /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute roles={routeRoles['/bookings']} module={routeModules['/bookings']}><BookingsPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute roles={routeRoles['/services']} module={routeModules['/services']}><ServicesPage /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute roles={routeRoles['/inventory']} module={routeModules['/inventory']}><InventoryPage /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute roles={routeRoles['/billing']} module={routeModules['/billing']}><BillingPage /></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute roles={routeRoles['/staff']} module={routeModules['/staff']}><StaffPage /></ProtectedRoute>} />
                <Route path="/technicians" element={<ProtectedRoute roles={routeRoles['/technicians']} module={routeModules['/technicians']}><TechniciansPage /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute roles={routeRoles['/suppliers']} module={routeModules['/suppliers']}><SuppliersPage /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute roles={routeRoles['/expenses']} module={routeModules['/expenses']}><ExpensesPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute roles={routeRoles['/reports']} module={routeModules['/reports']}><ReportsPage /></ProtectedRoute>} />
                <Route path="/admin/shops" element={<ProtectedRoute roles={[ROLES.ADMIN]}><ShopsPage /></ProtectedRoute>} />
                <Route path="/shop-setup" element={<ProtectedRoute roles={[ROLES.SOP_USER]}><ShopSetupPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/manager-permissions" element={<ProtectedRoute roles={[ROLES.ADMIN, ROLES.SOP_USER]}><ManagerPermissionsPage /></ProtectedRoute>} />
                <Route path="/admin/activity-logs" element={<ProtectedRoute roles={[ROLES.ADMIN]}><ActivityLogsPage /></ProtectedRoute>} />
                <Route path="/technician/jobs" element={<ProtectedRoute roles={[ROLES.TECHNICIAN]}><TechnicianJobsPage /></ProtectedRoute>} />
                <Route path="/customer/invoices" element={<ProtectedRoute roles={[ROLES.CUSTOMER]}><CustomerInvoicesPage /></ProtectedRoute>} />
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
        <CallProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </CallProvider>
      </Router>
    </Provider>
  )
}

export default App
