from django.contrib import admin
from apps.staff.models import Staff, Attendance

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ['get_name', 'designation', 'department', 'salary', 'is_active']
    list_filter = ['designation', 'department', 'is_active']
    search_fields = ['user__email', 'user__first_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def get_name(self, obj):
        return obj.user.get_full_name()
    get_name.short_description = 'Name'

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['staff', 'date', 'status', 'check_in_time', 'check_out_time']
    list_filter = ['date', 'status']
    search_fields = ['staff__user__email']
    readonly_fields = ['created_at']
