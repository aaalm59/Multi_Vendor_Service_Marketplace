from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, SerializerMethodField
from django.db import transaction
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from decimal import Decimal
from apps.billing.models import Invoice, InvoiceItem, Payment
from apps.inventory.models import Inventory, Product, StockMovement
from apps.inventory.views import ProductSerializer
from apps.users.permissions import CUSTOMER, HasRolePermission, SALES_ROLES, ADMIN
from apps.users.audit import AuditLoggingMixin
from apps.shops.views import TenantScopedViewSetMixin


class InvoiceItemSerializer(ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['product'] = data.pop('product_detail')
        return data

    class Meta:
        model = InvoiceItem
        fields = '__all__'


class InvoiceItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)


class InvoiceSerializer(ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    line_items = InvoiceItemWriteSerializer(many=True, write_only=True, required=False)
    shop_name = SerializerMethodField()
    shop_gst = SerializerMethodField()
    shop_phone = SerializerMethodField()
    customer_name = SerializerMethodField()

    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else None

    def get_shop_gst(self, obj):
        return obj.shop.gst_number if obj.shop else None

    def get_shop_phone(self, obj):
        return obj.shop.phone if obj.shop else None

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            name = f"{obj.customer.user.first_name} {obj.customer.user.last_name}".strip()
            return name or obj.customer.user.email
        return 'Walk-in Customer'

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount',
            'total_amount', 'invoice_date', 'created_at', 'updated_at',
        ]

    def create(self, validated_data):
        line_items = validated_data.pop('line_items', [])
        with transaction.atomic():
            invoice = Invoice.objects.create(**validated_data)
            subtotal = Decimal('0')
            tax_amount = Decimal('0')

            for item_data in line_items:
                product = item_data['product']
                if invoice.shop_id and product.shop_id and invoice.shop_id != product.shop_id:
                    raise serializers.ValidationError(
                        {'line_items': 'Product belongs to another shop.'}
                    )
                quantity = item_data['quantity']
                unit_price = item_data.get('unit_price') or product.price
                tax_rate = item_data.get('tax_rate') if item_data.get('tax_rate') is not None else product.tax_rate
                line_subtotal = Decimal(str(quantity)) * Decimal(str(unit_price))
                line_tax = line_subtotal * Decimal(str(tax_rate)) / Decimal('100')
                total = line_subtotal + line_tax
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                    tax_rate=tax_rate,
                    tax_amount=line_tax,
                    total=total,
                )
                subtotal += line_subtotal
                tax_amount += line_tax

                inventory = Inventory.objects.filter(product=product).first()
                if inventory:
                    inventory.quantity_on_hand = max(0, inventory.quantity_on_hand - quantity)
                    inventory.save(update_fields=['quantity_on_hand', 'last_stock_date'])
                StockMovement.objects.create(
                    shop=invoice.shop,
                    product=product,
                    movement_type='sale',
                    quantity=quantity,
                    reference_number=invoice.invoice_number,
                )

            if line_items:
                invoice.subtotal = subtotal
                invoice.tax_amount = tax_amount
                invoice.total_amount = subtotal + tax_amount - invoice.discount_amount
                invoice.save(update_fields=['subtotal', 'tax_amount', 'total_amount'])

            return invoice


class PaymentSerializer(ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'


class InvoiceViewSet(TenantScopedViewSetMixin, AuditLoggingMixin, viewsets.ModelViewSet):
    audit_module = 'billing'
    queryset = Invoice.objects.select_related(
        'shop', 'shop__owner', 'customer', 'customer__user',
    ).prefetch_related('items', 'items__product').all()
    serializer_class = InvoiceSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'billing'
    allowed_roles_by_action = {
        'read': SALES_ROLES | {CUSTOMER},
        'create': SALES_ROLES,
        'generate_pdf': SALES_ROLES | {CUSTOMER},
        'billing_analytics': {ADMIN},
        'daily_summary': SALES_ROLES,
        'write': SALES_ROLES,
    }
    filterset_fields = ['customer', 'payment_method']
    ordering_fields = ['invoice_date', 'total_amount']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, 'role', None)

        if role == CUSTOMER:
            return qs.filter(customer__user=user)

        if role == ADMIN or user.is_superuser:
            shop_id = self.request.query_params.get('shop')
            if shop_id:
                qs = qs.filter(shop_id=shop_id)

        return qs

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()
        return Response({'message': 'PDF generation not yet implemented'})

    @action(detail=False, methods=['get'])
    def billing_analytics(self, request):
        """Admin: shop-wise billing analytics."""
        from apps.shops.models import Shop

        today = timezone.now().date()
        shops = Shop.objects.filter(is_active=True).select_related('owner')
        result = []

        for shop in shops:
            qs = Invoice.objects.filter(shop=shop, is_active=True)
            today_qs = qs.filter(invoice_date__date=today)

            result.append({
                'shop_id': str(shop.id),
                'shop_name': shop.name,
                'shop_owner': shop.owner.get_full_name() if shop.owner else '',
                'total_revenue': round(float(qs.aggregate(t=Sum('total_amount'))['t'] or 0), 2),
                'today_revenue': round(float(today_qs.aggregate(t=Sum('total_amount'))['t'] or 0), 2),
                'total_invoices': qs.count(),
                'today_invoices': today_qs.count(),
                'avg_invoice': round(float(qs.aggregate(avg=Avg('total_amount'))['avg'] or 0), 2),
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Today's billing summary for current user's scope."""
        today = timezone.now().date()
        qs = self.get_queryset()
        today_qs = qs.filter(invoice_date__date=today)

        return Response({
            'today_invoices': today_qs.count(),
            'today_revenue': round(float(today_qs.aggregate(t=Sum('total_amount'))['t'] or 0), 2),
            'today_avg': round(float(today_qs.aggregate(avg=Avg('total_amount'))['avg'] or 0), 2),
            'total_invoices': qs.count(),
            'total_revenue': round(float(qs.aggregate(t=Sum('total_amount'))['t'] or 0), 2),
        })


class PaymentViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'billing'
    allowed_roles_by_action = {
        'read': SALES_ROLES | {CUSTOMER},
        'write': SALES_ROLES,
    }
    filterset_fields = ['invoice', 'status', 'payment_method']

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self.request.user, 'role', None) == CUSTOMER:
            return qs.filter(invoice__customer__user=self.request.user)
        return qs
