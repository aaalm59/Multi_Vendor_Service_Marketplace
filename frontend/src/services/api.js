import apiClient from './apiClient'

// Authentication APIs
export const authAPI = {
  login: (email, password) =>
    apiClient.post('/auth/login/', { email, password }),
  register: (data) =>
    apiClient.post('/auth/register/', data),
  logout: (refreshToken) =>
    apiClient.post('/auth/logout/', { refresh: refreshToken }),
  getCurrentUser: () =>
    apiClient.get('/auth/me/'),
  updateMe: (data) =>
    apiClient.patch('/auth/me/', data),
  changePassword: (data) =>
    apiClient.post('/auth/change_password/', data),
  passwordReset: (email) =>
    apiClient.post('/auth/password_reset/', { email }),
  passwordResetConfirm: (data) =>
    apiClient.post('/auth/password_reset_confirm/', data),
  refreshToken: (refresh) =>
    apiClient.post('/auth/token/refresh/', { refresh }),
}

// User APIs
export const userAPI = {
  getAll: (params) =>
    apiClient.get('/users/', { params }),
  getById: (id) =>
    apiClient.get(`/users/${id}/`),
  create: (data) =>
    apiClient.post('/users/', data),
  update: (id, data) =>
    apiClient.patch(`/users/${id}/`, data),
  delete: (id) =>
    apiClient.delete(`/users/${id}/`),
  getByRole: (role) =>
    apiClient.get(`/users/by_role/?role=${role}`),
  activate: (id) =>
    apiClient.post(`/users/${id}/activate/`),
  deactivate: (id) =>
    apiClient.post(`/users/${id}/deactivate/`),
}

// Shop APIs
export const shopAPI = {
  getAll: (params) =>
    apiClient.get('/shops/', { params }),
  getPublic: () =>
    apiClient.get('/shops/public/'),
  getById: (id) =>
    apiClient.get(`/shops/${id}/`),
  create: (data) =>
    apiClient.post('/shops/', data),
  update: (id, data) =>
    apiClient.patch(`/shops/${id}/`, data),
  approve: (id) =>
    apiClient.post(`/shops/${id}/approve/`),
  reject: (id) =>
    apiClient.post(`/shops/${id}/reject/`),
  suspend: (id) =>
    apiClient.post(`/shops/${id}/suspend/`),
  platformStats: () =>
    apiClient.get('/shops/platform_stats/'),
  myShop: () =>
    apiClient.get('/shops/my_shop/'),
  createMyShop: (data) =>
    apiClient.post('/shops/my_shop/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
  updateMyShop: (data) =>
    apiClient.patch('/shops/my_shop/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
}

// Customer APIs
export const customerAPI = {
  getAll: (params) =>
    apiClient.get('/customers/', { params }),
  getById: (id) =>
    apiClient.get(`/customers/${id}/`),
  create: (data) =>
    apiClient.post('/customers/', data),
  update: (id, data) =>
    apiClient.patch(`/customers/${id}/`, data),
  updateProfile: (id, data) =>
    apiClient.patch(`/customers/${id}/update_profile/`, data),
  delete: (id) =>
    apiClient.delete(`/customers/${id}/`),
  getByCity: (city) =>
    apiClient.get(`/customers/by_city/?city=${city}`),
  getTopCustomers: (limit = 10) =>
    apiClient.get(`/customers/top_customers/?limit=${limit}`),
  getBookings: (id) =>
    apiClient.get(`/customers/${id}/bookings/`),
}

// Booking APIs
export const bookingAPI = {
  getAll: (params) =>
    apiClient.get('/bookings/', { params }),
  getById: (id) =>
    apiClient.get(`/bookings/${id}/`),
  create: (data) =>
    apiClient.post('/bookings/', data),
  update: (id, data) =>
    apiClient.patch(`/bookings/${id}/`, data),
  assignTechnician: (id, technicianId) =>
    apiClient.post(`/bookings/${id}/assign_technician/`, { technician_id: technicianId }),
  markCompleted: (id, finalAmount) =>
    apiClient.post(`/bookings/${id}/mark_completed/`, { final_amount: finalAmount }),
  updateStatus: (id, statusVal, extra = {}) =>
    apiClient.post(`/bookings/${id}/update_status/`, { status: statusVal, ...extra }),
  cancelBooking: (id, reason) =>
    apiClient.post(`/bookings/${id}/cancel_booking/`, { reason }),
  selfAssign: (id) =>
    apiClient.post(`/bookings/${id}/self_assign/`),
  submitReview: (id, rating, review = '') =>
    apiClient.post(`/bookings/${id}/submit_review/`, { rating, review }),
  uploadRepairImage: (id, formData) =>
    apiClient.post(`/bookings/${id}/upload_repair_image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addNote: (id, note) =>
    apiClient.post(`/bookings/${id}/add_note/`, { note }),
  getRepairImages: (id) =>
    apiClient.get(`/bookings/${id}/repair_images/`),
  getMessages: (id) =>
    apiClient.get(`/bookings/${id}/messages/`),
  sendMessage: (id, payload) =>
    apiClient.post(`/bookings/${id}/messages/`, payload),
}

// Technician APIs
export const technicianAPI = {
  getAll: (params) =>
    apiClient.get('/technicians/', { params }),
  getById: (id) =>
    apiClient.get(`/technicians/${id}/`),
  getAvailable: () =>
    apiClient.get('/technicians/available/'),
  getBySpecialization: (spec) =>
    apiClient.get(`/technicians/by_specialization/?specialization=${spec}`),
  getAvailability: (id) =>
    apiClient.get(`/technicians/${id}/availability/`),
  create: (data) =>
    apiClient.post('/technicians/', data),
  update: (id, data) =>
    apiClient.patch(`/technicians/${id}/`, data),
}

// Staff APIs
export const staffAPI = {
  getAll: (params) =>
    apiClient.get('/staff/staff/', { params }),
  getById: (id) =>
    apiClient.get(`/staff/staff/${id}/`),
  create: (data) =>
    apiClient.post('/staff/staff/', data),
  update: (id, data) =>
    apiClient.patch(`/staff/staff/${id}/`, data),
  attendance: (params) =>
    apiClient.get('/staff/attendance/', { params }),
  markAttendance: (id, status = 'present') =>
    apiClient.post(`/staff/staff/${id}/mark_attendance/`, { status }),
}

// Service APIs
export const serviceAPI = {
  getAll: (params) =>
    apiClient.get('/services/', { params }),
  getById: (id) =>
    apiClient.get(`/services/${id}/`),
  create: (data) =>
    apiClient.post('/services/', data),
  update: (id, data) =>
    apiClient.patch(`/services/${id}/`, data),
  delete: (id) =>
    apiClient.delete(`/services/${id}/`),
}

// Product APIs
export const productAPI = {
  getAll: (params) =>
    apiClient.get('/inventory/products/', { params }),
  getById: (id) =>
    apiClient.get(`/inventory/products/${id}/`),
  create: (data) =>
    apiClient.post('/inventory/products/', data),
  update: (id, data) =>
    apiClient.patch(`/inventory/products/${id}/`, data),
  delete: (id) =>
    apiClient.delete(`/inventory/products/${id}/`),
  getLowStock: () =>
    apiClient.get('/inventory/products/low_stock/'),
  getByBarcode: (barcode) =>
    apiClient.get(`/inventory/products/by_barcode/?barcode=${barcode}`),
}

// Category APIs
export const categoryAPI = {
  getAll: () =>
    apiClient.get('/inventory/categories/'),
  create: (data) =>
    apiClient.post('/inventory/categories/', data),
  update: (id, data) =>
    apiClient.patch(`/inventory/categories/${id}/`, data),
}

// Invoice APIs
export const invoiceAPI = {
  getAll: (params) =>
    apiClient.get('/billing/invoices/', { params }),
  getById: (id) =>
    apiClient.get(`/billing/invoices/${id}/`),
  create: (data) =>
    apiClient.post('/billing/invoices/', data),
  generatePDF: (id) =>
    apiClient.post(`/billing/invoices/${id}/generate_pdf/`),
}

// Supplier APIs
export const supplierAPI = {
  getAll: (params) =>
    apiClient.get('/suppliers/suppliers/', { params }),
  getById: (id) =>
    apiClient.get(`/suppliers/suppliers/${id}/`),
  create: (data) =>
    apiClient.post('/suppliers/suppliers/', data),
  update: (id, data) =>
    apiClient.patch(`/suppliers/suppliers/${id}/`, data),
  delete: (id) =>
    apiClient.delete(`/suppliers/suppliers/${id}/`),
}

// Purchase APIs
export const purchaseAPI = {
  getAll: (params) =>
    apiClient.get('/suppliers/purchases/', { params }),
  getById: (id) =>
    apiClient.get(`/suppliers/purchases/${id}/`),
  create: (data) =>
    apiClient.post('/suppliers/purchases/', data),
  markReceived: (id) =>
    apiClient.post(`/suppliers/purchases/${id}/mark_received/`),
}

// Expense APIs
export const expenseAPI = {
  getAll: (params) =>
    apiClient.get('/expenses/', { params }),
  getById: (id) =>
    apiClient.get(`/expenses/${id}/`),
  create: (data) =>
    apiClient.post('/expenses/', data),
  update: (id, data) =>
    apiClient.patch(`/expenses/${id}/`, data),
  delete: (id) =>
    apiClient.delete(`/expenses/${id}/`),
}

export const expenseCategoryAPI = {
  getAll: (params) =>
    apiClient.get('/expenses/categories/', { params }),
  create: (data) =>
    apiClient.post('/expenses/categories/', data),
}

// Report APIs
export const reportAPI = {
  getAll: (params) =>
    apiClient.get('/reports/reports/', { params }),
  getDailyMetrics: (params) =>
    apiClient.get('/reports/daily-metrics/', { params }),
  getDashboardSummary: () =>
    apiClient.get('/reports/daily-metrics/dashboard_summary/'),
  export: (format, params) =>
    apiClient.get('/reports/reports/export/', { params: { format, ...params } }),
}

// Notification APIs
export const notificationAPI = {
  getAll: () =>
    apiClient.get('/notifications/'),
  getUnread: () =>
    apiClient.get('/notifications/unread/'),
  markAsRead: (id) =>
    apiClient.post(`/notifications/${id}/mark_as_read/`),
  markAllRead: () =>
    apiClient.post('/notifications/mark_all_read/'),
}

// Manager Permission APIs (admin only)
export const managerPermissionAPI = {
  getPermissions: (managerId) =>
    apiClient.get(`/users/${managerId}/manager_permissions/`),
  setPermissions: (managerId, permissions) =>
    apiClient.put(`/users/${managerId}/manager_permissions/`, { permissions }),
}

// Activity Log APIs (admin / manager)
export const activityLogAPI = {
  getAll: (params) =>
    apiClient.get('/users/activity-logs/', { params }),
  getByModule: (module, params) =>
    apiClient.get('/users/activity-logs/', { params: { module, ...params } }),
  getByUser: (userId, params) =>
    apiClient.get('/users/activity-logs/', { params: { user: userId, ...params } }),
}
