from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from django.db.models import Q, Sum, Avg, Count
from apps.customers.models import Customer
from apps.customers.serializers import CustomerCreateSerializer, CustomerDetailSerializer, CustomerUpdateSerializer
from apps.users.permissions import ADMIN, CUSTOMER, HasRolePermission, MANAGER_ROLES, SALES_ROLES
from apps.shops.views import TenantScopedViewSetMixin


class CustomerViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Customer.objects.select_related('user', 'shop').all()
    serializer_class = CustomerDetailSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'customers'
    allowed_roles_by_action = {
        'list':             SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'retrieve':         SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'create':           SALES_ROLES | MANAGER_ROLES,
        'update':           SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'partial_update':   SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'destroy':          SALES_ROLES | MANAGER_ROLES,
        'by_city':          SALES_ROLES | MANAGER_ROLES,
        'top_customers':    SALES_ROLES | MANAGER_ROLES,
        'bookings':         SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'update_profile':   SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'customer_analytics': {ADMIN},
    }

    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        if self.action in ('update', 'partial_update'):
            return CustomerUpdateSerializer
        return CustomerDetailSerializer

    filterset_fields = ['city', 'state']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'user__phone', 'city', 'shop_name']
    ordering_fields = ['created_at', 'total_spent', 'total_bookings', 'average_rating', 'city']

    def get_queryset(self):
        queryset = Customer.objects.select_related('user', 'shop').all()
        user = self.request.user
        role = getattr(user, 'role', None)

        if role == CUSTOMER:
            return queryset.filter(user=user)
        if user.is_superuser or role == ADMIN:
            shop_id = self.request.query_params.get('shop')
            if shop_id:
                queryset = queryset.filter(shop_id=shop_id)
            return queryset

        shop_id = getattr(user, 'shop_id', None)
        if shop_id:
            return queryset.filter(Q(shop_id=shop_id) | Q(user__shop_id=shop_id)).distinct()
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or getattr(user, 'role', None) == ADMIN:
            serializer.save()
            return
        if not getattr(user, 'shop_id', None):
            raise serializers.ValidationError({'shop': 'Staff user is not assigned to any shop.'})
        serializer.save(shop=user.shop)

    @action(detail=False, methods=['get'])
    def by_city(self, request):
        city = request.query_params.get('city')
        if not city:
            return Response({'error': 'City parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        customers = self.get_queryset().filter(city__icontains=city)
        return Response(self.get_serializer(customers, many=True).data)

    @action(detail=False, methods=['get'])
    def top_customers(self, request):
        limit = int(request.query_params.get('limit', 10))
        customers = self.get_queryset().order_by('-total_spent')[:limit]
        return Response(self.get_serializer(customers, many=True).data)

    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        customer = self.get_object()
        from apps.bookings.views import BookingSerializer
        qs = customer.bookings.select_related('service', 'technician__user').order_by('-created_at')
        return Response(BookingSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='update_profile')
    def update_profile(self, request, pk=None):
        customer = self.get_object()
        user = request.user
        if getattr(user, 'role', None) == CUSTOMER and customer.user != user:
            return Response({'error': 'You can only update your own profile'}, status=status.HTTP_403_FORBIDDEN)
        user_fields = {k: v for k, v in request.data.items() if k in ('first_name', 'last_name', 'phone')}
        if user_fields:
            for attr, val in user_fields.items():
                setattr(customer.user, attr, val)
            customer.user.save(update_fields=list(user_fields.keys()))
        serializer = CustomerUpdateSerializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CustomerDetailSerializer(customer).data)

    @action(detail=False, methods=['get'])
    def customer_analytics(self, request):
        """Admin: shop-wise customer analytics."""
        from apps.shops.models import Shop

        shops = Shop.objects.filter(is_active=True).select_related('owner')
        result = []
        for shop in shops:
            qs = Customer.objects.filter(shop=shop)
            agg = qs.aggregate(
                total_spent_sum=Sum('total_spent'),
                avg_spent=Avg('total_spent'),
                total_bookings_sum=Sum('total_bookings'),
                avg_rating=Avg('average_rating'),
                count=Count('id'),
            )
            cities = (
                qs.values('city').annotate(c=Count('id')).order_by('-c').first()
            )
            result.append({
                'shop_id': str(shop.id),
                'shop_name': shop.name,
                'shop_owner': shop.owner.get_full_name() if shop.owner else '',
                'total_customers': agg['count'] or 0,
                'total_spent': round(float(agg['total_spent_sum'] or 0), 2),
                'avg_spent': round(float(agg['avg_spent'] or 0), 2),
                'total_bookings': agg['total_bookings_sum'] or 0,
                'avg_rating': round(float(agg['avg_rating'] or 0), 2),
                'top_city': cities['city'] if cities else '—',
            })

        return Response(result)
