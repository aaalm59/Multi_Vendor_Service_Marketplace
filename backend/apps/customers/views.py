from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer, CustomerDetailSerializer, CustomerUpdateSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    """Customer management API"""
    queryset = Customer.objects.all()
    serializer_class = CustomerDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'update' or self.action == 'partial_update':
            return CustomerUpdateSerializer
        return CustomerDetailSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
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
