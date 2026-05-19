from django.contrib import admin
from apps.bookings.models import Booking

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_number', 'get_customer', 'service', 'status', 'booking_date']
    list_filter = ['status', 'booking_date', 'created_at']
    search_fields = ['booking_number', 'customer__user__email']
    readonly_fields = ['id', 'booking_number', 'created_at', 'updated_at']
    
    def get_customer(self, obj):
        return obj.customer.user.get_full_name()
    get_customer.short_description = 'Customer'
