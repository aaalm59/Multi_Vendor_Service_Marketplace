import {
  FiActivity,
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiSettings,
  FiShoppingCart,
  FiTool,
  FiTruck,
  FiUser,
  FiUsers,
  FiShield,
  FiClock,
} from 'react-icons/fi'

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  SALES_STAFF: 'sales_staff',
  INVENTORY_STAFF: 'inventory_staff',
  CUSTOMER: 'customer',
}

export const roleGroups = {
  all: Object.values(ROLES),
  management: [ROLES.ADMIN, ROLES.MANAGER],
  sales: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES_STAFF],
  inventory: [ROLES.ADMIN, ROLES.MANAGER, ROLES.INVENTORY_STAFF],
  service: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN],
  customerOps: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES_STAFF, ROLES.CUSTOMER],
}

// navItems: each item has roles (which roles CAN see it) and optional module (for manager dynamic check)
export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FiHome, roles: roleGroups.all },
  { path: '/customers', label: 'Customers', customerLabel: 'My Profile', icon: FiUsers, roles: roleGroups.customerOps, module: 'customers' },
  { path: '/bookings', label: 'Bookings', icon: FiShoppingCart, roles: [...roleGroups.service, ROLES.CUSTOMER], module: 'bookings' },
  { path: '/services', label: 'Services', icon: FiTool, roles: roleGroups.all, module: 'services' },
  { path: '/inventory', label: 'Inventory', icon: FiBox, roles: [...roleGroups.sales, ROLES.INVENTORY_STAFF], module: 'inventory' },
  { path: '/billing', label: 'Billing', icon: FiDollarSign, roles: roleGroups.sales, module: 'billing' },
  { path: '/staff', label: 'Staff', icon: FiBriefcase, roles: roleGroups.management, module: 'staff' },
  { path: '/technicians', label: 'Technicians', icon: FiActivity, roles: roleGroups.service, module: 'technicians' },
  { path: '/suppliers', label: 'Suppliers', icon: FiTruck, roles: roleGroups.inventory, module: 'suppliers' },
  { path: '/expenses', label: 'Expenses', icon: FiDollarSign, roles: roleGroups.management, module: 'expenses' },
  { path: '/reports', label: 'Reports', icon: FiBarChart2, roles: roleGroups.management, module: 'reports' },
  { path: '/technician/jobs', label: 'My Jobs', icon: FiTool, roles: [ROLES.TECHNICIAN] },
  { path: '/admin/users', label: 'User Management', icon: FiShield, roles: [ROLES.ADMIN] },
  { path: '/admin/manager-permissions', label: 'Manager Permissions', icon: FiShield, roles: [ROLES.ADMIN] },
  { path: '/admin/activity-logs', label: 'Activity Logs', icon: FiClock, roles: [ROLES.ADMIN] },
  { path: '/settings', label: 'Settings', icon: FiSettings, roles: [...roleGroups.management, ROLES.CUSTOMER] },
]

/**
 * Returns true if the user can access a route/item.
 * For managers, also checks their dynamic module permissions (view action required).
 */
export const canAccess = (user, roles, module) => {
  if (!roles?.length) return true
  if (!user?.role) return false
  if (!roles.includes(user.role)) return false

  // Admins always pass
  if (user.role === ROLES.ADMIN) return true

  // For managers: check dynamic module permission (view)
  if (user.role === ROLES.MANAGER && module) {
    const perms = user.permissions || []
    return perms.some((p) => p.module === module && p.action === 'view')
  }

  return true
}

/**
 * Check if the manager user has a specific action on a module.
 * Non-managers always return true if they have role access.
 */
export const canDo = (user, module, action) => {
  if (!user) return false
  if (user.role === ROLES.ADMIN || user.role !== ROLES.MANAGER) return true
  const perms = user.permissions || []
  return perms.some((p) => p.module === module && p.action === action)
}

export const firstRouteForRole = (user) => {
  if (user?.role === ROLES.TECHNICIAN) return '/technician/jobs'
  if (user?.role === ROLES.CUSTOMER) return '/dashboard'
  return navItems.find((item) => canAccess(user, item.roles, item.module))?.path || '/dashboard'
}

// Dedicated navigation for customer role — never depends on permission assignments
export const customerNavItems = [
  { path: '/dashboard',           label: 'Dashboard',    icon: FiHome },
  { path: '/bookings',            label: 'My Bookings',  icon: FiCalendar },
  { path: '/customer/invoices',   label: 'My Invoices',  icon: FiFileText },
  { path: '/customers',           label: 'My Profile',   icon: FiUser },
  { path: '/settings',            label: 'Settings',     icon: FiSettings },
]
