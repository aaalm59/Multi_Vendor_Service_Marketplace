from django.db import models
from apps.users.models import BaseModel, User
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
    landmark = models.CharField(max_length=255, blank=True)
    area = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    problem_description = models.TextField()
    problem_image = models.ImageField(upload_to='problems/', null=True, blank=True)
    notes = models.TextField(blank=True)
    quote_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    cancellation_reason = models.TextField(blank=True)
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


class RepairImage(models.Model):
    """Photos uploaded by technician during repair."""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='repair_images')
    image = models.ImageField(upload_to='repairs/')
    caption = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Image for {self.booking.booking_number}"


class BookingMessage(models.Model):
    """Chat messages between customer, technician, and managers for a booking."""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_booking_messages')
    message = models.TextField(blank=True)
    attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.get_full_name()} → {self.booking.booking_number}: {self.message[:40]}"
