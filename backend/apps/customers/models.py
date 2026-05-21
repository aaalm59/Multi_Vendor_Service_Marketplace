from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.users.models import BaseModel, User
import uuid

class Customer(BaseModel):
    """Customer model"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    shop = models.ForeignKey('shops.Shop', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    gst_number = models.CharField(max_length=20, null=True, blank=True)
    shop_name = models.CharField(max_length=255, null=True, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    total_bookings = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    average_rating = models.FloatField(default=0, validators=[MinValueValidator(0)])
    preferred_contact = models.CharField(max_length=20, choices=[('phone', 'Phone'), ('email', 'Email'), ('sms', 'SMS')], default='phone')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['shop']),
            models.Index(fields=['city']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.city}"
