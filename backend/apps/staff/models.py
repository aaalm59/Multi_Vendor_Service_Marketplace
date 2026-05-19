from django.db import models
from apps.users.models import BaseModel, User
from django.core.validators import MinValueValidator
import uuid

class Staff(BaseModel):
    """Staff model"""
    DESIGNATION_CHOICES = (
        ('manager', 'Manager'),
        ('sales_executive', 'Sales Executive'),
        ('inventory_executive', 'Inventory Executive'),
        ('accountant', 'Accountant'),
        ('support', 'Support Staff'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    designation = models.CharField(max_length=50, choices=DESIGNATION_CHOICES)
    department = models.CharField(max_length=100)
    salary = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    joining_date = models.DateField()
    date_of_birth = models.DateField(null=True, blank=True)
    emergency_contact = models.CharField(max_length=15)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Staff'
        verbose_name_plural = 'Staff'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_designation_display()}"

class Attendance(models.Model):
    """Staff attendance tracking"""
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('leave', 'Leave'),
        ('half_day', 'Half Day'),
    )
    
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ('staff', 'date')
        indexes = [
            models.Index(fields=['staff', 'date']),
        ]
    
    def __str__(self):
        return f"{self.staff.user.get_full_name()} - {self.date} ({self.get_status_display()})"
