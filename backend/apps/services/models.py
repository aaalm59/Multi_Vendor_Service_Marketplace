from django.db import models
from apps.users.models import BaseModel
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class Service(BaseModel):
    """Service model"""
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, null=True, blank=True, related_name='services')
    name = models.CharField(max_length=255)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0)])
    estimated_duration = models.IntegerField(help_text="Duration in minutes", validators=[MinValueValidator(15)])
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to='services/', null=True, blank=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        indexes = [
            models.Index(fields=['shop']),
        ]
    
    def __str__(self):
        return self.name
