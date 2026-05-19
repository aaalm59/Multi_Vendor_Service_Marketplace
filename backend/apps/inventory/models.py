from django.db import models
from apps.users.models import BaseModel
from django.core.validators import MinValueValidator
import uuid

class ProductCategory(BaseModel):
    """Product category"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, null=True, blank=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name

class Product(BaseModel):
    """Product model"""
    SKU = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, related_name='products')
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    barcode = models.CharField(max_length=100, unique=True, null=True, blank=True)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    unit = models.CharField(max_length=20, default='piece')
    is_taxable = models.BooleanField(default=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18, validators=[MinValueValidator(0)])
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        indexes = [
            models.Index(fields=['SKU']),
            models.Index(fields=['barcode']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.SKU})"

class Inventory(models.Model):
    """Inventory tracking"""
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory')
    quantity_on_hand = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    quantity_reserved = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    reorder_level = models.IntegerField(default=10, validators=[MinValueValidator(0)])
    reorder_quantity = models.IntegerField(default=50, validators=[MinValueValidator(0)])
    last_stock_date = models.DateField(auto_now=True)
    warehouse_location = models.CharField(max_length=100, blank=True)
    
    class Meta:
        verbose_name = 'Inventory'
        verbose_name_plural = 'Inventory'
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_on_hand} units"
    
    @property
    def available_quantity(self):
        return self.quantity_on_hand - self.quantity_reserved
    
    @property
    def is_low_stock(self):
        return self.available_quantity <= self.reorder_level

class StockMovement(models.Model):
    """Stock movement history"""
    MOVEMENT_TYPE_CHOICES = (
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('adjustment', 'Adjustment'),
        ('damage', 'Damage'),
        ('return', 'Return'),
    )
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity = models.IntegerField(validators=[MinValueValidator(0)])
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.get_movement_type_display()}"
