from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from apps.users.models import ManagerPermission, ActivityLog
from apps.users.serializers import UserSerializer, UserDetailSerializer, UserUpdateSerializer, AdminUserUpdateSerializer, AdminUserCreateSerializer, ManagerPermissionSerializer, ActivityLogSerializer
from apps.users.permissions import IsAdminOrManager, ADMIN, SOP_USER, PERMISSION_ASSIGNER_ROLES, PERMISSION_ASSIGNABLE_ROLES
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

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser or getattr(user, 'role', None) == ADMIN:
            return queryset
        if getattr(user, 'shop_id', None):
            return queryset.filter(shop_id=user.shop_id)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or getattr(user, 'role', None) == ADMIN:
            serializer.save()
            return
        if getattr(user, 'shop_id', None):
            serializer.save(shop=user.shop)
            return
        serializer.save()

    @action(detail=False, methods=['get'])
    def by_role(self, request):
        role = request.query_params.get('role')
        if not role:
            return Response({'error': 'Role parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        users = self.get_queryset().filter(role=role)
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
        """GET returns current permissions; PUT replaces them for a staff user."""
        if request.user.role not in PERMISSION_ASSIGNER_ROLES and not request.user.is_superuser:
            return Response({'error': 'Permission assignment access required'}, status=status.HTTP_403_FORBIDDEN)

        staff_user = self.get_object()
        if staff_user.role not in PERMISSION_ASSIGNABLE_ROLES:
            return Response({'error': 'Permissions can be assigned only to staff roles'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == SOP_USER and staff_user.shop_id != request.user.shop_id:
            return Response({'error': 'Cannot modify another shop user'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            perms = ManagerPermission.objects.filter(manager=staff_user)
            return Response(ManagerPermissionSerializer(perms, many=True).data)

        # PUT — replace all permissions
        permissions_data = request.data.get('permissions', [])
        ManagerPermission.objects.filter(manager=staff_user).delete()
        created = []
        for item in permissions_data:
            perm, _ = ManagerPermission.objects.get_or_create(
                manager=staff_user,
                module=item.get('module'),
                action=item.get('action'),
            )
            created.append(perm)
        ActivityLog.log(request.user, 'permission_change', 'users',
            f"Updated permissions for {staff_user.get_full_name()} ({len(created)} permissions set)",
            request=request, object_id=staff_user.pk)
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
