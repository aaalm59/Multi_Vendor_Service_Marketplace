from django.db import models
from apps.users.models import BaseModel
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta
import uuid

class Report(BaseModel):
    """Report model"""
    REPORT_TYPE_CHOICES = (
        ('revenue', 'Revenue Report'),
        ('profit_loss', 'Profit & Loss'),
        ('inventory', 'Inventory Report'),
        ('staff_performance', 'Staff Performance'),
        ('customer_activity', 'Customer Activity'),
        ('technician_performance', 'Technician Performance'),
    )
    
    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    description = models.TextField(blank=True)
    generated_date = models.DateTimeField(auto_now_add=True)
    start_date = models.DateField()
    end_date = models.DateField()
    data = models.JSONField(default=dict)
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    created_by = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-generated_date']
        verbose_name = 'Report'
        verbose_name_plural = 'Reports'
    
    def __str__(self):
        return self.title

class DailyMetrics(models.Model):
    """Daily metrics tracking"""
    date = models.DateField(unique=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_bookings = models.IntegerField(default=0)
    completed_bookings = models.IntegerField(default=0)
    pending_bookings = models.IntegerField(default=0)
    total_products_sold = models.IntegerField(default=0)
    new_customers = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-date']
        verbose_name = 'Daily Metrics'
        verbose_name_plural = 'Daily Metrics'
    
    def __str__(self):
        return f"Metrics for {self.date}"
