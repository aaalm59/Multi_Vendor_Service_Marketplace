from django.contrib import admin
from apps.inventory.models import Product, ProductCategory, Inventory, StockMovement

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'SKU', 'category', 'price', 'cost_price', 'is_active']
    list_filter = ['category', 'is_taxable', 'is_active']
    search_fields = ['name', 'SKU', 'barcode']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'quantity_on_hand', 'reorder_level', 'available_quantity', 'is_low_stock']
    list_filter = ['last_stock_date']
    search_fields = ['product__name']
    readonly_fields = ['available_quantity', 'is_low_stock']

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'created_at']
    list_filter = ['movement_type', 'created_at']
    search_fields = ['product__name', 'reference_number']
    readonly_fields = ['created_at']
