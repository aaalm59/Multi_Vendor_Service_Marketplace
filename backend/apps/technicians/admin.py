from django.contrib import admin
from apps.technicians.models import Technician, TechnicianAvailability

@admin.register(Technician)
class TechnicianAdmin(admin.ModelAdmin):
    list_display = ['get_name', 'specialization', 'availability_status', 'average_rating', 'is_active']
    list_filter = ['availability_status', 'is_active', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'specialization']
    readonly_fields = ['id', 'total_earnings', 'created_at', 'updated_at']
    
    def get_name(self, obj):
        return obj.user.get_full_name()
    get_name.short_description = 'Name'

@admin.register(TechnicianAvailability)
class TechnicianAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['technician', 'date', 'start_time', 'end_time', 'is_available']
    list_filter = ['date', 'is_available']
    search_fields = ['technician__user__email']
