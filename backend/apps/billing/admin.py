from django.contrib import admin
from apps.billing.models import Invoice, InvoiceItem, Payment

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'get_customer', 'total_amount', 'payment_method', 'invoice_date']
    list_filter = ['payment_method', 'invoice_date']
    search_fields = ['invoice_number', 'customer__user__email']
    readonly_fields = ['id', 'invoice_number', 'created_at', 'updated_at']
    
    def get_customer(self, obj):
        return obj.customer.user.get_full_name() if obj.customer else 'N/A'
    get_customer.short_description = 'Customer'

@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'product', 'quantity', 'unit_price', 'total']
    list_filter = ['invoice__invoice_date']
    search_fields = ['invoice__invoice_number', 'product__name']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['invoice__invoice_number', 'transaction_id']
    readonly_fields = ['created_at']
