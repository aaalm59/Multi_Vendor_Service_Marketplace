from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer, SerializerMethodField, DecimalField
from django.db.models import Avg, Count, Sum
from apps.services.models import Service, ServiceCategory
from apps.users.permissions import ALL_AUTH_ROLES, HasRolePermission, MANAGER_ROLES, ADMIN
from apps.shops.views import TenantScopedViewSetMixin


class ServiceCategorySerializer(ModelSerializer):
    service_count = SerializerMethodField()

    def get_service_count(self, obj):
        return obj.services.filter(is_active=True).count()

    class Meta:
        model = ServiceCategory
        fields = '__all__'


class ServiceSerializer(ModelSerializer):
    category_detail = ServiceCategorySerializer(source='category', read_only=True)
    shop_name = SerializerMethodField()
    shop_owner = SerializerMethodField()
    booking_count = SerializerMethodField()
    price_with_gst = SerializerMethodField()

    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else None

    def get_shop_owner(self, obj):
        if obj.shop and obj.shop.owner:
            return obj.shop.owner.get_full_name() or obj.shop.owner.email
        return None

    def get_booking_count(self, obj):
        return getattr(obj, '_booking_count', None) or obj.bookings.count()

    def get_price_with_gst(self, obj):
        return round(obj.price_with_gst, 2)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['category'] = data.pop('category_detail')
        return data

    class Meta:
        model = Service
        fields = '__all__'


class ServiceCategoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [HasRolePermission]
    permission_module = 'services'
    allowed_roles_by_action = {
        'read': ALL_AUTH_ROLES,
        'write': MANAGER_ROLES,
    }
    search_fields = ['name']


class ServiceViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Service.objects.select_related('shop', 'shop__owner', 'category').all()
    serializer_class = ServiceSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'services'
    allowed_roles_by_action = {
        'read': ALL_AUTH_ROLES,
        'service_analytics': {ADMIN},
        'write': MANAGER_ROLES,
    }
    filterset_fields = ['is_available', 'is_featured', 'category']
    search_fields = ['name', 'description', 'tags']

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', None)

        if role == 'customer':
            qs = Service.objects.select_related('shop', 'shop__owner', 'category').filter(is_available=True)
            shop_id = self.request.query_params.get('shop')
            if shop_id:
                return qs.filter(shop_id=shop_id)
            return qs

        qs = super().get_queryset()

        if role == ADMIN or user.is_superuser:
            shop_id = self.request.query_params.get('shop')
            if shop_id:
                qs = qs.filter(shop_id=shop_id)

        return qs

    @action(detail=False, methods=['get'])
    def service_analytics(self, request):
        """Admin: shop-wise service analytics."""
        from apps.shops.models import Shop

        shops = Shop.objects.filter(is_active=True).select_related('owner')
        result = []
        for shop in shops:
            qs = Service.objects.filter(shop=shop)
            total = qs.count()
            available = qs.filter(is_available=True).count()
            featured = qs.filter(is_featured=True).count()
            avg_price = qs.aggregate(avg=Avg('base_price'))['avg'] or 0
            avg_duration = qs.aggregate(avg=Avg('estimated_duration'))['avg'] or 0
            most_booked = (
                qs.annotate(bc=Count('bookings'))
                  .order_by('-bc')
                  .values('name', 'bc')
                  .first()
            )

            result.append({
                'shop_id': str(shop.id),
                'shop_name': shop.name,
                'shop_owner': shop.owner.get_full_name() if shop.owner else '',
                'total_services': total,
                'available_services': available,
                'featured_services': featured,
                'avg_price': round(float(avg_price), 2),
                'avg_duration': round(float(avg_duration), 0),
                'most_booked': most_booked['name'] if most_booked else None,
            })

        return Response(result)
