from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrManager(BasePermission):
    """Allow full access to admins/managers, read-only access to authenticated users."""

    allowed_roles = {'admin', 'manager'}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in self.allowed_roles or request.user.is_superuser


class IsBusinessStaff(BasePermission):
    """Allow shop staff roles to use operational endpoints."""

    allowed_roles = {'admin', 'manager', 'sales_staff', 'inventory_staff'}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles or request.user.is_superuser
