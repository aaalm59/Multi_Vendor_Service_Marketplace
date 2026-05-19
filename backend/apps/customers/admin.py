from django.contrib import admin
from apps.customers.models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['get_name', 'city', 'total_spent', 'average_rating', 'is_active']
    list_filter = ['city', 'is_active', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'city']
    readonly_fields = ['id', 'total_spent', 'total_bookings', 'average_rating', 'created_at', 'updated_at']
    
    def get_name(self, obj):
        return obj.user.get_full_name()
    get_name.short_description = 'Name'
