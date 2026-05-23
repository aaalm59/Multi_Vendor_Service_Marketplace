from django.db.models import Count, Sum
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
        'suspend': {ADMIN},
        'platform_stats': {ADMIN},
        'my_shop': {SOP_USER},
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
        # SOP user without shop yet: show shops they own so they can set up
        if getattr(user, 'role', None) == SOP_USER:
            return queryset.filter(owner=user)
        return queryset.none()

    @staticmethod
    def _sync_owner_shop(shop):
        """When a shop is created/updated with an owner, link that owner to this shop."""
        if shop.owner and shop.owner.shop_id != shop.id:
            shop.owner.shop = shop
            shop.owner.save(update_fields=['shop'])

    def perform_create(self, serializer):
        shop = serializer.save()
        self._sync_owner_shop(shop)

    def perform_update(self, serializer):
        old_owner = serializer.instance.owner
        shop = serializer.save()
        # Clear old owner's shop link if owner changed
        if old_owner and old_owner != shop.owner and old_owner.shop_id == shop.id:
            old_owner.shop = None
            old_owner.save(update_fields=['shop'])
        self._sync_owner_shop(shop)

    @action(detail=False, methods=['get'], permission_classes=[HasRolePermission])
    def public(self, request):
        shops = Shop.objects.filter(status='approved', is_active=True)
        serializer = self.get_serializer(shops, many=True)
        return Response(serializer.data)

    @staticmethod
    def _set_shop_users_active(shop, is_active):
        """Activate or deactivate the shop owner and all staff belonging to this shop."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Update shop owner
        if shop.owner:
            shop.owner.is_active = is_active
            shop.owner.save(update_fields=['is_active'])
        # Update all staff users assigned to this shop (excluding super-admins)
        User.objects.filter(shop=shop).exclude(
            role__in=['admin']
        ).update(is_active=is_active)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        shop = self.get_object()
        shop.status = 'approved'
        shop.is_active = True
        shop.approved_by = request.user
        shop.approved_at = timezone.now()
        shop.save(update_fields=['status', 'is_active', 'approved_by', 'approved_at', 'updated_at'])
        # Re-enable shop owner and all staff when shop is approved
        self._set_shop_users_active(shop, True)
        ActivityLog.log(request.user, 'approve', 'shops', f"Approved shop {shop.name}", request=request, object_id=shop.pk)
        return Response(self.get_serializer(shop).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        shop = self.get_object()
        shop.status = 'rejected'
        shop.is_active = False
        shop.save(update_fields=['status', 'is_active', 'updated_at'])
        # Block shop owner and staff from logging in when shop is rejected
        self._set_shop_users_active(shop, False)
        ActivityLog.log(request.user, 'approve', 'shops', f"Rejected shop {shop.name}", request=request, object_id=shop.pk)
        return Response(self.get_serializer(shop).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        shop = self.get_object()
        shop.status = 'suspended'
        shop.is_active = False
        shop.save(update_fields=['status', 'is_active', 'updated_at'])
        # Block shop owner and staff from logging in when shop is suspended
        self._set_shop_users_active(shop, False)
        ActivityLog.log(request.user, 'status_change', 'shops', f"Suspended shop {shop.name}", request=request, object_id=shop.pk)
        return Response(self.get_serializer(shop).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def platform_stats(self, request):
        """Super admin — cross-shop aggregate analytics."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        total_shops = Shop.objects.count()
        active_shops = Shop.objects.filter(status='approved', is_active=True).count()
        pending_shops = Shop.objects.filter(status='pending').count()

        from apps.bookings.models import Booking
        from apps.billing.models import Invoice

        total_bookings = Booking.objects.count()
        total_revenue = Invoice.objects.filter(is_active=True).aggregate(total=Sum('total_amount'))['total'] or 0
        total_customers = User.objects.filter(role='customer').count()
        total_staff = User.objects.filter(role__in=['manager', 'sales_staff', 'inventory_staff', 'technician']).count()

        shop_stats = Shop.objects.annotate(
            booking_count=Count('bookings'),
        ).values('id', 'name', 'status', 'city', 'booking_count')

        return Response({
            'total_shops': total_shops,
            'active_shops': active_shops,
            'pending_shops': pending_shops,
            'total_bookings': total_bookings,
            'total_revenue': float(total_revenue),
            'total_customers': total_customers,
            'total_staff': total_staff,
            'shop_breakdown': list(shop_stats),
        })

    @action(detail=False, methods=['get', 'post', 'patch'])
    def my_shop(self, request):
        """SOP user — get or create/update their own shop profile."""
        user = request.user
        if request.method == 'GET':
            shop = Shop.objects.filter(owner=user).first()
            if not shop:
                return Response({'detail': 'No shop created yet.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(self.get_serializer(shop).data)

        if request.method == 'POST':
            if Shop.objects.filter(owner=user).exists():
                return Response({'detail': 'Shop already exists. Use PATCH to update.'}, status=status.HTTP_400_BAD_REQUEST)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            shop = serializer.save(owner=user, status='pending')
            # Link the SOP user to this shop
            user.shop = shop
            user.save(update_fields=['shop'])
            ActivityLog.log(user, 'create', 'shops', f"SOP user created shop: {shop.name}", request=request, object_id=shop.pk)
            return Response(self.get_serializer(shop).data, status=status.HTTP_201_CREATED)

        # PATCH
        shop = Shop.objects.filter(owner=user).first()
        if not shop:
            return Response({'detail': 'No shop found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(shop, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        ActivityLog.log(user, 'update', 'shops', f"Updated shop profile: {shop.name}", request=request, object_id=shop.pk)
        return Response(self.get_serializer(shop).data)
