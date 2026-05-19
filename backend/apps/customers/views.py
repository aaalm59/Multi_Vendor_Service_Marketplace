from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.customers.models import Customer
from apps.customers.serializers import CustomerCreateSerializer, CustomerDetailSerializer, CustomerUpdateSerializer
from apps.users.permissions import CUSTOMER, HasRolePermission, MANAGER_ROLES, SALES_ROLES

class CustomerViewSet(viewsets.ModelViewSet):
    """Customer management API"""
    queryset = Customer.objects.all()
    serializer_class = CustomerDetailSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'customers'
    allowed_roles_by_action = {
        'list':            SALES_ROLES | MANAGER_ROLES | {CUSTOMER},  # customer sees only own record (get_queryset filters)
        'retrieve':        SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'create':          SALES_ROLES | MANAGER_ROLES,
        'update':          SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'partial_update':  SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'destroy':         SALES_ROLES | MANAGER_ROLES,
        'by_city':         SALES_ROLES | MANAGER_ROLES,
        'top_customers':   SALES_ROLES | MANAGER_ROLES,
        'bookings':        SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'update_profile':  SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
    }
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        if self.action == 'update' or self.action == 'partial_update':
            return CustomerUpdateSerializer
        return CustomerDetailSerializer
    
    filterset_fields = ['city', 'state']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'user__phone', 'city', 'shop_name']
    ordering_fields = ['created_at', 'total_spent', 'city']

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self.request.user, 'role', None) == CUSTOMER:
            return queryset.filter(user=self.request.user)
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_city(self, request):
        """Get customers filtered by city"""
        city = request.query_params.get('city')
        if not city:
            return Response({'error': 'City parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        customers = Customer.objects.filter(city__icontains=city)
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def top_customers(self, request):
        """Get top customers by spending"""
        limit = int(request.query_params.get('limit', 10))
        customers = Customer.objects.order_by('-total_spent')[:limit]
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        """List bookings for a specific customer."""
        customer = self.get_object()
        from apps.bookings.views import BookingSerializer
        qs = customer.bookings.select_related('service', 'technician__user').order_by('-created_at')
        return Response(BookingSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='update_profile')
    def update_profile(self, request, pk=None):
        """Customer updates own profile including user-level fields (name, phone)."""
        customer = self.get_object()
        user = request.user
        if getattr(user, 'role', None) == CUSTOMER and customer.user != user:
            return Response({'error': 'You can only update your own profile'},
                            status=status.HTTP_403_FORBIDDEN)
        user_fields = {k: v for k, v in request.data.items()
                       if k in ('first_name', 'last_name', 'phone')}
        if user_fields:
            for attr, val in user_fields.items():
                setattr(customer.user, attr, val)
            customer.user.save(update_fields=list(user_fields.keys()))
        serializer = CustomerUpdateSerializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CustomerDetailSerializer(customer).data, status=status.HTTP_200_OK)
