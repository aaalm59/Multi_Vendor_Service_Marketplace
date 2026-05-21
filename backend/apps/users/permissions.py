from rest_framework.permissions import BasePermission, SAFE_METHODS

ADMIN = 'admin'
SOP_USER = 'sop_user'
MANAGER = 'manager'
TECHNICIAN = 'technician'
SALES_STAFF = 'sales_staff'
INVENTORY_STAFF = 'inventory_staff'
CUSTOMER = 'customer'

ADMIN_ROLES = {ADMIN}
MANAGER_ROLES = {ADMIN, SOP_USER, MANAGER}
SHOP_ROLES = {ADMIN, SOP_USER, MANAGER, SALES_STAFF, INVENTORY_STAFF}
SALES_ROLES = {ADMIN, SOP_USER, MANAGER, SALES_STAFF}
INVENTORY_ROLES = {ADMIN, SOP_USER, MANAGER, INVENTORY_STAFF}
SERVICE_ROLES = {ADMIN, SOP_USER, MANAGER, TECHNICIAN}
ALL_AUTH_ROLES = {ADMIN, MANAGER, TECHNICIAN, SALES_STAFF, INVENTORY_STAFF, CUSTOMER}
ALL_AUTH_ROLES = ALL_AUTH_ROLES | {SOP_USER}

# Maps HTTP method / DRF action to ManagerPermission.action values
_SAFE_ACTIONS = {'list', 'retrieve', 'available', 'by_role', 'by_city', 'by_specialization',
                 'availability', 'top_customers', 'dashboard_summary'}


def _manager_action_for_request(request, view):
    """Return the ManagerPermission action string that the current request requires."""
    drf_action = getattr(view, 'action', None)
    if drf_action in ('export', 'export_csv'):
        return 'export_csv'
    if drf_action in ('manage_staff', 'mark_attendance'):
        return 'manage_staff'
    if drf_action in ('assign_technician',):
        return 'manage_bookings'
    if request.method in SAFE_METHODS or drf_action in _SAFE_ACTIONS:
        return 'view'
    if drf_action == 'create' or request.method == 'POST':
        return 'create'
    if drf_action in ('update', 'partial_update') or request.method in ('PUT', 'PATCH'):
        return 'update'
    if drf_action == 'destroy' or request.method == 'DELETE':
        return 'delete'
    return 'view'


def _manager_has_module_permission(user, module, action):
    """Check ManagerPermission table for the given user/module/action."""
    if not module:
        return True
    return user.manager_permissions.filter(module=module, action=action).exists()


class HasRolePermission(BasePermission):
    """Role-based permission helper for DRF viewsets.

    Views can define:
    - allowed_roles = {'admin', 'manager'}
    - allowed_roles_by_action = {'list': {...}, 'create': {...}, 'read': {...}, 'write': {...}}
    - permission_module = 'bookings'  # used for manager dynamic permission check
    """

    def _roles_for_request(self, request, view):
        action = getattr(view, 'action', None)
        role_map = getattr(view, 'allowed_roles_by_action', {}) or {}
        if action and action in role_map:
            return role_map[action]
        method_key = 'read' if request.method in SAFE_METHODS else 'write'
        if method_key in role_map:
            return role_map[method_key]
        return getattr(view, 'allowed_roles', ALL_AUTH_ROLES)

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True

        allowed_roles = self._roles_for_request(request, view)
        user_role = request.user.role

        if user_role not in allowed_roles:
            return False

        # For managers, additionally enforce dynamic module permissions
        if user_role == MANAGER:
            module = getattr(view, 'permission_module', None)
            if module:
                needed_action = _manager_action_for_request(request, view)
                return _manager_has_module_permission(request.user, module, needed_action)

        return True


class IsAdminOrManager(BasePermission):
    """Allow access to admins/managers only."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in {ADMIN, SOP_USER, MANAGER} or request.user.is_superuser


class IsBusinessStaff(BasePermission):
    """Allow shop staff roles to use operational endpoints."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in {ADMIN, SOP_USER, MANAGER, SALES_STAFF, INVENTORY_STAFF} or request.user.is_superuser
