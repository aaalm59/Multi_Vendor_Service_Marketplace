from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from django.db import transaction
from decimal import Decimal
from apps.billing.models import Invoice, InvoiceItem, Payment
from apps.inventory.models import Inventory, Product, StockMovement
from apps.inventory.views import ProductSerializer
from apps.users.permissions import CUSTOMER, HasRolePermission, SALES_ROLES

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
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'invoice_number', 'subtotal', 'tax_amount', 'total_amount', 'invoice_date', 'created_at', 'updated_at']

    def create(self, validated_data):
        line_items = validated_data.pop('line_items', [])
        with transaction.atomic():
            invoice = Invoice.objects.create(**validated_data)
            subtotal = Decimal('0')
            tax_amount = Decimal('0')

            for item_data in line_items:
                product = item_data['product']
                quantity = item_data['quantity']
                unit_price = item_data.get('unit_price') or product.price
                tax_rate = item_data.get('tax_rate', product.tax_rate)
                line_subtotal = Decimal(quantity) * unit_price
                line_tax = line_subtotal * tax_rate / Decimal('100')
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

class InvoiceViewSet(viewsets.ModelViewSet):
    """Invoice/Sales API"""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'read': SALES_ROLES | {CUSTOMER},
        'create': SALES_ROLES,
        'generate_pdf': SALES_ROLES | {CUSTOMER},
        'write': SALES_ROLES,
    }
    filterset_fields = ['customer', 'payment_method']
    ordering_fields = ['invoice_date', 'total_amount']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(user, 'role', None) == CUSTOMER:
            return queryset.filter(customer__user=user)
        return queryset
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Generate invoice PDF"""
        invoice = self.get_object()
        # PDF generation logic would go here
        return Response({'message': 'PDF generation not yet implemented'})

class PaymentViewSet(viewsets.ModelViewSet):
    """Payment management API"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'read': SALES_ROLES | {CUSTOMER},
        'write': SALES_ROLES,
    }
    filterset_fields = ['invoice', 'status', 'payment_method']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(user, 'role', None) == CUSTOMER:
            return queryset.filter(invoice__customer__user=user)
        return queryset
