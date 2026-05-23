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
  FiShoppingBag,
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
  SOP_USER: 'sop_user',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  SALES_STAFF: 'sales_staff',
  INVENTORY_STAFF: 'inventory_staff',
  CUSTOMER: 'customer',
}

export const roleGroups = {
  all: Object.values(ROLES),
  management: [ROLES.ADMIN, ROLES.SOP_USER, ROLES.MANAGER],
  sales: [ROLES.ADMIN, ROLES.SOP_USER, ROLES.MANAGER, ROLES.SALES_STAFF],
  inventory: [ROLES.ADMIN, ROLES.SOP_USER, ROLES.MANAGER, ROLES.INVENTORY_STAFF],
  service: [ROLES.ADMIN, ROLES.SOP_USER, ROLES.MANAGER, ROLES.TECHNICIAN],
  customerOps: [ROLES.ADMIN, ROLES.SOP_USER, ROLES.MANAGER, ROLES.SALES_STAFF, ROLES.CUSTOMER],
}

export const dynamicPermissionRoles = [
  ROLES.MANAGER,
  ROLES.SALES_STAFF,
  ROLES.INVENTORY_STAFF,
]

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
  { path: '/admin/shops', label: 'Shops', icon: FiShoppingBag, roles: [ROLES.ADMIN] },
  { path: '/shop-setup', label: 'My Shop', icon: FiShoppingBag, roles: [ROLES.SOP_USER] },
  { path: '/admin/users', label: 'User Management', icon: FiShield, roles: [ROLES.ADMIN] },
  { path: '/admin/manager-permissions', label: 'Staff Permissions', icon: FiShield, roles: [ROLES.ADMIN, ROLES.SOP_USER] },
  { path: '/admin/activity-logs', label: 'Activity Logs', icon: FiClock, roles: [ROLES.ADMIN] },
  { path: '/settings', label: 'Settings', icon: FiSettings, roles: roleGroups.all },
]

/**
 * Returns true if the user can access a route/item.
 * For dynamic staff roles, also checks module permissions (view action required).
 */
export const canAccess = (user, roles, module) => {
  if (!roles?.length) return true
  if (!user?.role) return false
  if (!roles.includes(user.role)) return false

  // Platform admin and shop owner are unrestricted inside their own backend scope.
  if (user.role === ROLES.ADMIN || user.role === ROLES.SOP_USER) return true

  if (dynamicPermissionRoles.includes(user.role) && module) {
    const perms = user.permissions || []
    return perms.some((p) => p.module === module && p.action === 'view')
  }

  return true
}

/**
 * Check whether the user has a specific action on a module.
 */
export const canDo = (user, module, action) => {
  if (!user) return false
  if (user.role === ROLES.ADMIN || user.role === ROLES.SOP_USER) return true
  if (!dynamicPermissionRoles.includes(user.role)) return true
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
