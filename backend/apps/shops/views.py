from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.shops.models import Shop
from apps.users.audit import AuditLoggingMixin
from apps.users.models import ActivityLog
from apps.users.permissions import ADMIN, ALL_AUTH_ROLES, HasRolePermission, MANAGER_ROLES, SOP_USER


def user_shop_id(user):
    return getattr(user, 'shop_id', None)


def tenant_queryset(queryset, user, shop_field='shop'):
    """Apply shop isolation for non-admin operational users."""
    if not user or not user.is_authenticated:
        return queryset.none()
    if user.is_superuser or getattr(user, 'role', None) == ADMIN:
        return queryset
    shop_id = user_shop_id(user)
    if not shop_id:
        return queryset.none()
    return queryset.filter(**{f'{shop_field}_id': shop_id})


class TenantScopedViewSetMixin:
    """DRF viewset mixin for automatic shop filtering and assignment."""

    shop_field = 'shop'

    def get_queryset(self):
        queryset = super().get_queryset()
        return tenant_queryset(queryset, self.request.user, self.shop_field)

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, 'role', None) == ADMIN or user.is_superuser:
            serializer.save()
            return
        shop_id = user_shop_id(user)
        if shop_id:
            serializer.save(**{self.shop_field: user.shop})
            return
        serializer.save()


class ShopSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = '__all__'
        read_only_fields = ['id', 'approved_by', 'approved_at', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        return obj.owner.get_full_name() if obj.owner else ''


class ShopViewSet(AuditLoggingMixin, viewsets.ModelViewSet):
    """Shop/tenant management API."""

    audit_module = 'shops'
    queryset = Shop.objects.select_related('owner', 'approved_by').all()
    serializer_class = ShopSerializer
    permission_classes = [HasRolePermission]
    permission_module = None
    allowed_roles_by_action = {
        'read': ALL_AUTH_ROLES,
        'create': {ADMIN},
        'approve': {ADMIN},
        'reject': {ADMIN},
        'write': {ADMIN, SOP_USER},
    }
    filterset_fields = ['status', 'city', 'is_active']
    search_fields = ['name', 'owner__first_name', 'owner__last_name', 'owner__email', 'phone', 'city']
    ordering_fields = ['name', 'created_at', 'city']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser or getattr(user, 'role', None) == ADMIN:
            return queryset
        if getattr(user, 'role', None) == 'customer':
            return queryset.filter(status='approved', is_active=True)
        if getattr(user, 'shop_id', None):
            return queryset.filter(id=user.shop_id)
        return queryset.none()

    @action(detail=False, methods=['get'], permission_classes=[HasRolePermission])
    def public(self, request):
        shops = Shop.objects.filter(status='approved', is_active=True)
        serializer = self.get_serializer(shops, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        shop = self.get_object()
        shop.status = 'approved'
        shop.approved_by = request.user
        shop.approved_at = timezone.now()
        shop.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        ActivityLog.log(request.user, 'approve', 'shops', f"Approved shop {shop.name}", request=request, object_id=shop.pk)
        return Response(self.get_serializer(shop).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        shop = self.get_object()
        shop.status = 'rejected'
        shop.save(update_fields=['status', 'updated_at'])
        ActivityLog.log(request.user, 'approve', 'shops', f"Rejected shop {shop.name}", request=request, object_id=shop.pk)
        return Response(self.get_serializer(shop).data, status=status.HTTP_200_OK)
