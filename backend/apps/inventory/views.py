from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import IntegerField, ModelSerializer, SerializerMethodField
from django.db.models import F
from apps.inventory.models import Product, ProductCategory, Inventory, StockMovement
from apps.users.permissions import HasRolePermission, INVENTORY_ROLES, SALES_ROLES
from apps.users.audit import AuditLoggingMixin
from apps.shops.views import TenantScopedViewSetMixin

class ProductCategorySerializer(ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = '__all__'

class ProductSerializer(ModelSerializer):
    category_detail = ProductCategorySerializer(source='category', read_only=True)
    inventory = SerializerMethodField()
    initial_stock = IntegerField(write_only=True, required=False, min_value=0, default=0)
    reorder_level = IntegerField(write_only=True, required=False, min_value=0, default=10)

    def get_inventory(self, obj):
        inventory = getattr(obj, 'inventory', None)
        if not inventory:
            return None
        return InventorySerializer(inventory).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['category'] = data.pop('category_detail')
        return data

    class Meta:
        model = Product
        fields = '__all__'

    def create(self, validated_data):
        initial_stock = validated_data.pop('initial_stock', 0)
        reorder_level = validated_data.pop('reorder_level', 10)
        product = super().create(validated_data)
        Inventory.objects.get_or_create(
            product=product,
            defaults={
                'shop': product.shop,
                'quantity_on_hand': initial_stock,
                'reorder_level': reorder_level,
                'reorder_quantity': max(10, initial_stock),
            },
        )
        if initial_stock:
            StockMovement.objects.create(
                shop=product.shop,
                product=product,
                movement_type='purchase',
                quantity=initial_stock,
                reference_number='OPENING-STOCK',
            )
        return product

class InventorySerializer(ModelSerializer):
    product_name = SerializerMethodField()
    
    def get_product_name(self, obj):
        return obj.product.name
    
    class Meta:
        model = Inventory
        fields = '__all__'

class StockMovementSerializer(ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'

class ProductCategoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """Product category API"""
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }

class ProductViewSet(TenantScopedViewSetMixin, AuditLoggingMixin, viewsets.ModelViewSet):
    """Product management API"""
    audit_module = 'inventory'
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'inventory'
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'low_stock': SALES_ROLES | INVENTORY_ROLES,
        'by_barcode': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }
    filterset_fields = ['category', 'is_taxable']
    search_fields = ['name', 'SKU', 'barcode']
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get low stock products"""
        low_stock_products = self.get_queryset().filter(
            inventory__quantity_on_hand__lte=F('inventory__reorder_level')
        )
        serializer = self.get_serializer(low_stock_products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_barcode(self, request):
        """Get product by barcode"""
        barcode = request.query_params.get('barcode')
        if not barcode:
            return Response({'error': 'Barcode required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product = self.get_queryset().get(barcode=barcode)
            serializer = self.get_serializer(product)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

class InventoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """Inventory management API"""
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }
    filterset_fields = ['product']

class StockMovementViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """Stock movement API"""
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }
    filterset_fields = ['product', 'movement_type']
