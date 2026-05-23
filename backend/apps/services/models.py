from django.db import models
from apps.users.models import BaseModel
from django.core.validators import MinValueValidator


class ServiceCategory(BaseModel):
    """Service category (shop-scoped)"""
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE,
        null=True, blank=True, related_name='service_categories',
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, default='🔧', blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'

    def __str__(self):
        return self.name


class Service(BaseModel):
    """Service model"""
    shop = models.ForeignKey(
        'shops.Shop', on_delete=models.CASCADE,
        null=True, blank=True, related_name='services',
    )
    category = models.ForeignKey(
        ServiceCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='services',
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    base_price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)],
    )
    gst_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=18,
        validators=[MinValueValidator(0)],
    )
    estimated_duration = models.IntegerField(
        help_text='Duration in minutes', validators=[MinValueValidator(1)],
    )
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    tags = models.CharField(max_length=500, blank=True, help_text='Comma-separated tags')
    image = models.ImageField(upload_to='services/', null=True, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        indexes = [
            models.Index(fields=['shop']),
            models.Index(fields=['category']),
            models.Index(fields=['is_available']),
        ]

    def __str__(self):
        return self.name

    @property
    def price_with_gst(self):
        return float(self.base_price) * (1 + float(self.gst_rate) / 100)
