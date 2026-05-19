from django.db import models
from apps.users.models import BaseModel, User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class Technician(BaseModel):
    """Technician model"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='technician_profile')
    specialization = models.CharField(max_length=255)
    experience_years = models.IntegerField(validators=[MinValueValidator(0)])
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0)])
    availability_status = models.CharField(
        max_length=20,
        choices=[('available', 'Available'), ('busy', 'Busy'), ('offline', 'Offline')],
        default='available'
    )
    total_bookings = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    completed_bookings = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    average_rating = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(5)])
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    certificate_file = models.FileField(upload_to='certificates/', null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Technician'
        verbose_name_plural = 'Technicians'
        indexes = [
            models.Index(fields=['availability_status']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.specialization}"

class TechnicianAvailability(models.Model):
    """Technician availability tracking"""
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, related_name='availability_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['date', 'start_time']
        unique_together = ('technician', 'date', 'start_time')
        indexes = [
            models.Index(fields=['technician', 'date']),
        ]
    
    def __str__(self):
        return f"{self.technician.user.get_full_name()} - {self.date} {self.start_time}"
