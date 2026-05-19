from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from apps.users.models import ManagerPermission, ActivityLog
from apps.users.serializers import UserSerializer, UserDetailSerializer, UserUpdateSerializer, AdminUserUpdateSerializer, AdminUserCreateSerializer, ManagerPermissionSerializer, ActivityLogSerializer
from apps.users.permissions import IsAdminOrManager, ADMIN, HasRolePermission
from apps.users.audit import AuditLoggingMixin

User = get_user_model()


class UserViewSet(AuditLoggingMixin, viewsets.ModelViewSet):
    audit_module = 'users'
    """User management API"""
    queryset = User.objects.all().order_by('-created_at')
    serializer_class = UserDetailSerializer
    permission_classes = [IsAdminOrManager]
    filterset_fields = ['role', 'is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'email', 'role']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return AdminUserUpdateSerializer
        return UserDetailSerializer

    @action(detail=False, methods=['get'])
    def by_role(self, request):
        role = request.query_params.get('role')
        if not role:
            return Response({'error': 'Role parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        users = User.objects.filter(role=role)
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'message': 'User activated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'message': 'User deactivated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'put'], url_path='manager_permissions')
    def manager_permissions(self, request, pk=None):
        """GET returns current permissions; PUT replaces them. Admin only."""
        if request.user.role != ADMIN and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        manager = self.get_object()
        if manager.role != 'manager':
            return Response({'error': 'User is not a manager'}, status=status.HTTP_400_BAD_REQUEST)

        if request.method == 'GET':
            perms = ManagerPermission.objects.filter(manager=manager)
            return Response(ManagerPermissionSerializer(perms, many=True).data)

        # PUT — replace all permissions
        permissions_data = request.data.get('permissions', [])
        ManagerPermission.objects.filter(manager=manager).delete()
        created = []
        for item in permissions_data:
            perm, _ = ManagerPermission.objects.get_or_create(
                manager=manager,
                module=item.get('module'),
                action=item.get('action'),
            )
            created.append(perm)
        ActivityLog.log(request.user, 'permission_change', 'users',
            f"Updated permissions for manager {manager.get_full_name()} ({len(created)} permissions set)",
            request=request, object_id=manager.pk)
        return Response(ManagerPermissionSerializer(created, many=True).data, status=status.HTTP_200_OK)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit trail — admin read-only."""
    queryset = ActivityLog.objects.select_related('user').all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdminOrManager]
    filterset_fields = ['action', 'module']
    search_fields = ['description', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
