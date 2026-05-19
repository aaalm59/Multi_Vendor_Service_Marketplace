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
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"


class ManagerPermission(models.Model):
    """Dynamic per-module permissions that Admin assigns to a Manager user."""
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
        ('manage_staff', 'Manage Staff'),
        ('manage_inventory', 'Manage Inventory'),
        ('manage_services', 'Manage Services'),
        ('manage_bookings', 'Manage Bookings'),
    )

    manager = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='manager_permissions',
        limit_choices_to={'role': 'manager'},
    )
    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)

    class Meta:
        unique_together = ('manager', 'module', 'action')
        ordering = ['manager', 'module', 'action']
        verbose_name = 'Manager Permission'
        verbose_name_plural = 'Manager Permissions'

    def __str__(self):
        return f"{self.manager.get_full_name()} — {self.module}:{self.action}"
