import {
  FiActivity,
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiDollarSign,
  FiHome,
  FiSettings,
  FiShoppingCart,
  FiTool,
  FiTruck,
  FiUsers,
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

export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FiHome, roles: roleGroups.all },
  { path: '/customers', label: 'Customers', icon: FiUsers, roles: roleGroups.customerOps },
  { path: '/bookings', label: 'Bookings', icon: FiShoppingCart, roles: [...roleGroups.service, ROLES.CUSTOMER] },
  { path: '/services', label: 'Services', icon: FiTool, roles: roleGroups.all },
  { path: '/inventory', label: 'Inventory', icon: FiBox, roles: [...roleGroups.sales, ROLES.INVENTORY_STAFF] },
  { path: '/billing', label: 'Billing', icon: FiDollarSign, roles: roleGroups.sales },
  { path: '/staff', label: 'Staff', icon: FiBriefcase, roles: roleGroups.management },
  { path: '/technicians', label: 'Technicians', icon: FiActivity, roles: roleGroups.service },
  { path: '/suppliers', label: 'Suppliers', icon: FiTruck, roles: roleGroups.inventory },
  { path: '/expenses', label: 'Expenses', icon: FiDollarSign, roles: roleGroups.management },
  { path: '/reports', label: 'Reports', icon: FiBarChart2, roles: roleGroups.management },
  { path: '/settings', label: 'Settings', icon: FiSettings, roles: roleGroups.management },
]

export const canAccess = (user, roles) => {
  if (!roles?.length) return true
  if (!user?.role) return false
  return roles.includes(user.role)
}

export const firstRouteForRole = (user) => {
  return navItems.find((item) => canAccess(user, item.roles))?.path || '/dashboard'
}
