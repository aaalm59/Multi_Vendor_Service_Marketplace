from django.contrib import admin
from apps.services.models import Service

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'base_price', 'estimated_duration', 'is_available']
    list_filter = ['is_available', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
