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
    allowed_roles_by_action = {
        'read': SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'create': SALES_ROLES | MANAGER_ROLES,
        'write': SALES_ROLES | MANAGER_ROLES | {CUSTOMER},
        'by_city': SALES_ROLES | MANAGER_ROLES,
        'top_customers': SALES_ROLES | MANAGER_ROLES,
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
