from django.contrib import admin

from apps.shops.models import Shop


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'city', 'status', 'is_active')
    list_filter = ('status', 'is_active', 'city')
    search_fields = ('name', 'owner__email', 'phone', 'city')
