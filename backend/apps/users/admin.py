from django.contrib import admin
from apps.users.models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_active', 'created_at']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
