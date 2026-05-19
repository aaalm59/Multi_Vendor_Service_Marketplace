from django.db import models
from apps.users.models import BaseModel
from django.core.validators import MinValueValidator
import uuid

class Supplier(BaseModel):
    """Supplier model"""
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    gst_number = models.CharField(max_length=20, null=True, blank=True)
    account_holder_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    ifsc_code = models.CharField(max_length=20, blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'
    
    def __str__(self):
        return self.name

class Purchase(BaseModel):
    """Purchase order model"""
    purchase_number = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchases')
    purchase_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    expected_delivery = models.DateField(null=True, blank=True)
    actual_delivery = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('received', 'Received'), ('cancelled', 'Cancelled')],
        default='pending'
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-purchase_date']
        verbose_name = 'Purchase'
        verbose_name_plural = 'Purchases'
    
    def __str__(self):
        return self.purchase_number
    
    def save(self, *args, **kwargs):
        if not self.purchase_number:
            import uuid
            self.purchase_number = f"PO{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)

class PurchaseItem(models.Model):
    """Purchase order items"""
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=255)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    
    def __str__(self):
        return f"{self.purchase.purchase_number} - {self.product_name}"
