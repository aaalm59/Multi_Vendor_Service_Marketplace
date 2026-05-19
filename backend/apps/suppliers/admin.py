from django.contrib import admin
from apps.suppliers.models import Supplier, Purchase, PurchaseItem

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'total_purchases', 'is_active']
    list_filter = ['city', 'is_active']
    search_fields = ['name', 'email', 'phone']
    readonly_fields = ['id', 'total_purchases', 'total_paid', 'created_at', 'updated_at']

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['purchase_number', 'supplier', 'purchase_date', 'status', 'total_amount']
    list_filter = ['status', 'purchase_date']
    search_fields = ['purchase_number', 'supplier__name']
    readonly_fields = ['id', 'purchase_number', 'created_at', 'updated_at']

@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    list_display = ['purchase', 'product_name', 'quantity', 'unit_price', 'total']
