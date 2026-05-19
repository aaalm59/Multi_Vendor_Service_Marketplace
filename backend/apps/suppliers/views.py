from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from apps.suppliers.models import Supplier, Purchase, PurchaseItem
from apps.users.permissions import HasRolePermission, INVENTORY_ROLES

class PurchaseItemSerializer(ModelSerializer):
    class Meta:
        model = PurchaseItem
        fields = '__all__'

class PurchaseSerializer(ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ['id', 'purchase_number', 'created_at', 'updated_at']

class SupplierSerializer(ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class SupplierViewSet(viewsets.ModelViewSet):
    """Supplier management API"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'suppliers'
    allowed_roles = INVENTORY_ROLES
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'total_purchases']

class PurchaseViewSet(viewsets.ModelViewSet):
    """Purchase order API"""
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [HasRolePermission]
    allowed_roles = INVENTORY_ROLES
    filterset_fields = ['supplier', 'status']
    ordering_fields = ['purchase_date', 'total_amount']
    
    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        """Mark purchase as received"""
        purchase = self.get_object()
        from datetime import datetime
        purchase.actual_delivery = datetime.now().date()
        purchase.status = 'received'
        purchase.save()
        
        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_200_OK)
