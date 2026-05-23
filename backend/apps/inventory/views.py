from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers
from rest_framework.serializers import IntegerField, ModelSerializer, SerializerMethodField
from django.db.models import F, Sum, ExpressionWrapper, DecimalField
from apps.inventory.models import Product, ProductCategory, Inventory, StockMovement
from apps.shops.models import Shop
from apps.users.permissions import HasRolePermission, INVENTORY_ROLES, SALES_ROLES, ADMIN
from apps.users.audit import AuditLoggingMixin
from apps.shops.views import TenantScopedViewSetMixin


class ProductCategorySerializer(ModelSerializer):
    shop_name = SerializerMethodField()
    product_count = SerializerMethodField()
    # shop is injected by TenantScopedViewSetMixin.perform_create, not required in request data
    shop = drf_serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False,
        allow_null=True,
    )

    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else None

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()

    class Meta:
        model = ProductCategory
        fields = '__all__'
        # UniqueTogetherValidator for (shop, name) requires shop in request data,
        # but shop is injected by TenantScopedViewSetMixin.perform_create.
        # The DB unique constraint still enforces this at the database level.
        validators = []


class ProductSerializer(ModelSerializer):
    category_detail = ProductCategorySerializer(source='category', read_only=True)
    inventory = SerializerMethodField()
    initial_stock = IntegerField(write_only=True, required=False, min_value=0, default=0)
    reorder_level = IntegerField(write_only=True, required=False, min_value=0, default=10)
    shop_name = SerializerMethodField()
    shop_owner = SerializerMethodField()

    def get_inventory(self, obj):
        inventory = getattr(obj, 'inventory', None)
        if not inventory:
            return None
        return InventorySerializer(inventory).data

    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else None

    def get_shop_owner(self, obj):
        if obj.shop and obj.shop.owner:
            return obj.shop.owner.get_full_name() or obj.shop.owner.email
        return None

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
    queryset = ProductCategory.objects.select_related('shop').all()
    serializer_class = ProductCategorySerializer
    permission_classes = [HasRolePermission]
    permission_module = 'inventory'
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }
    search_fields = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        shop_id = self.request.query_params.get('shop')
        user = self.request.user
        if shop_id and (user.is_superuser or getattr(user, 'role', None) == ADMIN):
            qs = qs.filter(shop_id=shop_id)
        return qs


class ProductViewSet(TenantScopedViewSetMixin, AuditLoggingMixin, viewsets.ModelViewSet):
    audit_module = 'inventory'
    queryset = Product.objects.select_related('shop', 'shop__owner', 'category').all()
    serializer_class = ProductSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'inventory'
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'low_stock': SALES_ROLES | INVENTORY_ROLES,
        'by_barcode': SALES_ROLES | INVENTORY_ROLES,
        'inventory_analytics': {ADMIN},
        'write': INVENTORY_ROLES,
    }
    filterset_fields = ['category', 'is_taxable']
    search_fields = ['name', 'SKU', 'barcode']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        shop_id = self.request.query_params.get('shop')
        if shop_id and (user.is_superuser or getattr(user, 'role', None) == ADMIN):
            queryset = queryset.filter(shop_id=shop_id)
        return queryset

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        qs = self.get_queryset().filter(
            inventory__quantity_on_hand__lte=F('inventory__reorder_level')
        )
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def by_barcode(self, request):
        barcode = request.query_params.get('barcode')
        if not barcode:
            return Response({'error': 'Barcode required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            product = self.get_queryset().get(barcode=barcode)
            return Response(self.get_serializer(product).data)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def inventory_analytics(self, request):
        """Admin: shop-wise inventory analytics."""
        from apps.shops.models import Shop

        shops = Shop.objects.filter(is_active=True).select_related('owner')
        result = []
        for shop in shops:
            inv_qs = Inventory.objects.filter(shop=shop)
            total_products = Product.objects.filter(shop=shop).count()
            total_stock = inv_qs.aggregate(t=Sum('quantity_on_hand'))['t'] or 0
            low_stock_count = inv_qs.filter(quantity_on_hand__lte=F('reorder_level')).count()
            stock_value = inv_qs.annotate(
                item_value=ExpressionWrapper(
                    F('quantity_on_hand') * F('product__cost_price'),
                    output_field=DecimalField(max_digits=15, decimal_places=2),
                )
            ).aggregate(total=Sum('item_value'))['total'] or 0

            result.append({
                'shop_id': str(shop.id),
                'shop_name': shop.name,
                'shop_owner': shop.owner.get_full_name() if shop.owner else '',
                'total_products': total_products,
                'total_stock': total_stock,
                'low_stock_count': low_stock_count,
                'stock_value': round(float(stock_value), 2),
            })

        return Response(result)


class InventoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    permission_classes = [HasRolePermission]
    permission_module = 'inventory'
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }
    filterset_fields = ['product']


class StockMovementViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'inventory'
    allowed_roles_by_action = {
        'read': SALES_ROLES | INVENTORY_ROLES,
        'write': INVENTORY_ROLES,
    }
    filterset_fields = ['product', 'movement_type']
