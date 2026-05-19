from django.db import models
from apps.users.models import BaseModel
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Notification(BaseModel):
    """Notification model"""
    NOTIFICATION_TYPE_CHOICES = (
        ('booking_assigned', 'Booking Assigned'),
        ('booking_completed', 'Booking Completed'),
        ('payment_received', 'Payment Received'),
        ('low_stock', 'Low Stock Alert'),
        ('purchase_received', 'Purchase Received'),
        ('payment_due', 'Payment Due'),
        ('system', 'System Notification'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPE_CHOICES)
    related_id = models.CharField(max_length=100, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.URLField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"
