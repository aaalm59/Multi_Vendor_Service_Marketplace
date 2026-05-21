from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
import uuid

class BaseModel(models.Model):
    """Base model with common fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']

class User(AbstractUser):
    """Custom user model"""
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('sop_user', 'SOP User / Shop Manager'),
        ('manager', 'Manager'),
        ('technician', 'Technician'),
        ('sales_staff', 'Sales Staff'),
        ('inventory_staff', 'Inventory Staff'),
        ('customer', 'Customer'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=15, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    shop = models.ForeignKey(
        'shops.Shop',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text='Tenant shop for SOP users and staff. Super admins/customers may be global.',
    )
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['role']),
            models.Index(fields=['shop', 'role']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"


class ManagerPermission(models.Model):
    """Dynamic per-module permissions assigned to a shop staff user.

    The model name is kept for migration/API compatibility with the existing
    manager-permissions endpoint, but it now powers staff RBAC too.
    """
    MODULE_CHOICES = (
        ('customers', 'Customers'),
        ('bookings', 'Bookings'),
        ('inventory', 'Inventory'),
        ('services', 'Services'),
        ('staff', 'Staff'),
        ('billing', 'Billing'),
        ('reports', 'Reports'),
        ('suppliers', 'Suppliers'),
        ('expenses', 'Expenses'),
        ('technicians', 'Technicians'),
    )
    ACTION_CHOICES = (
        ('view', 'View'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('export_csv', 'Export CSV'),
        ('export', 'Export'),
        ('approve', 'Approve'),
        ('assign', 'Assign'),
        ('manage_staff', 'Manage Staff'),
        ('manage_inventory', 'Manage Inventory'),
        ('manage_services', 'Manage Services'),
        ('manage_bookings', 'Manage Bookings'),
    )

    manager = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='manager_permissions',
    )
    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)

    class Meta:
        unique_together = ('manager', 'module', 'action')
        ordering = ['manager', 'module', 'action']
        verbose_name = 'Staff Permission'
        verbose_name_plural = 'Staff Permissions'

    def __str__(self):
        return f"{self.manager.get_full_name()} — {self.module}:{self.action}"


class ActivityLog(models.Model):
    """Audit trail — every significant user action is recorded here."""
    ACTION_CHOICES = (
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('export', 'Export'),
        ('view', 'View'),
        ('assign', 'Assign'),
        ('status_change', 'Status Change'),
        ('permission_change', 'Permission Change'),
    )

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs'
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    module = models.CharField(max_length=50)
    description = models.TextField()
    object_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    extra = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['module', 'action']),
        ]

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {user_str} — {self.action} on {self.module}"

    @classmethod
    def log(cls, user, action, module, description, request=None, object_id='', extra=None):
        ip = None
        ua = ''
        if request:
            xff = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', '')[:500]
        cls.objects.create(
            user=user if (user and user.is_authenticated) else None,
            action=action,
            module=module,
            description=description,
            object_id=str(object_id),
            ip_address=ip,
            user_agent=ua,
            extra=extra or {},
        )
