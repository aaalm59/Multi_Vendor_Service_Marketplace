from django.db import models
from apps.users.models import BaseModel
from django.core.validators import MinValueValidator
import uuid

class ExpenseCategory(models.Model):
    """Expense category"""
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, null=True, blank=True, related_name='expense_categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        unique_together = ('shop', 'name')
    
    def __str__(self):
        return self.name

class Expense(BaseModel):
    """Expense model"""
    EXPENSE_CHOICES = (
        ('rent', 'Shop Rent'),
        ('electricity', 'Electricity Bill'),
        ('salary', 'Salary'),
        ('transport', 'Transport'),
        ('maintenance', 'Maintenance'),
        ('misc', 'Miscellaneous'),
    )
    
    expense_number = models.CharField(max_length=50, unique=True)
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, null=True, blank=True, related_name='expenses')
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    expense_date = models.DateField()
    payment_method = models.CharField(
        max_length=20,
        choices=[('cash', 'Cash'), ('bank_transfer', 'Bank Transfer'), ('cheque', 'Cheque')],
        default='cash'
    )
    receipt_image = models.ImageField(upload_to='receipts/', null=True, blank=True)
    notes = models.TextField(blank=True)
    approved_by = models.CharField(max_length=100, blank=True)
    is_approved = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-expense_date']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        indexes = [
            models.Index(fields=['expense_date']),
            models.Index(fields=['shop', 'expense_date']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return self.expense_number
    
    def save(self, *args, **kwargs):
        if not self.expense_number:
            import uuid
            self.expense_number = f"EXP{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)
