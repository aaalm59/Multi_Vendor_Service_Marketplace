from django.db import models
from apps.users.models import BaseModel
from apps.customers.models import Customer
from apps.technicians.models import Technician
from apps.services.models import Service
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class Booking(BaseModel):
    """Service booking model"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    booking_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, related_name='bookings')
    technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    booking_date = models.DateTimeField()
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    service_address = models.TextField()
    problem_description = models.TextField()
    problem_image = models.ImageField(upload_to='problems/', null=True, blank=True)
    notes = models.TextField(blank=True)
    quote_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    rating = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    review = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['technician', 'status']),
            models.Index(fields=['booking_date']),
        ]
    
    def __str__(self):
        return f"{self.booking_number} - {self.customer.user.get_full_name()}"
    
    def save(self, *args, **kwargs):
        if not self.booking_number:
            import uuid
            self.booking_number = f"BK{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)
