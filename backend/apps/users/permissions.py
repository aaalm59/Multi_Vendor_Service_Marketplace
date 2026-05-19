from rest_framework.permissions import BasePermission, SAFE_METHODS

ADMIN = 'admin'
MANAGER = 'manager'
TECHNICIAN = 'technician'
SALES_STAFF = 'sales_staff'
INVENTORY_STAFF = 'inventory_staff'
CUSTOMER = 'customer'

ADMIN_ROLES = {ADMIN}
MANAGER_ROLES = {ADMIN, MANAGER}
SHOP_ROLES = {ADMIN, MANAGER, SALES_STAFF, INVENTORY_STAFF}
SALES_ROLES = {ADMIN, MANAGER, SALES_STAFF}
INVENTORY_ROLES = {ADMIN, MANAGER, INVENTORY_STAFF}
SERVICE_ROLES = {ADMIN, MANAGER, TECHNICIAN}
ALL_AUTH_ROLES = {ADMIN, MANAGER, TECHNICIAN, SALES_STAFF, INVENTORY_STAFF, CUSTOMER}


class HasRolePermission(BasePermission):
    """Role based permission helper for DRF viewsets.

    Views can define:
    - allowed_roles = {'admin', 'manager'}
    - allowed_roles_by_action = {'list': {...}, 'create': {...}, 'read': {...}, 'write': {...}}
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
        return request.user.role in allowed_roles


class IsAdminOrManager(BasePermission):
    """Allow access to admins/managers only."""

    allowed_roles = {'admin', 'manager'}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles or request.user.is_superuser


class IsBusinessStaff(BasePermission):
    """Allow shop staff roles to use operational endpoints."""

    allowed_roles = {'admin', 'manager', 'sales_staff', 'inventory_staff'}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles or request.user.is_superuser
