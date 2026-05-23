from django.db import models
from django.contrib.auth import get_user_model
from apps.users.models import BaseModel

User = get_user_model()

NOTIF_TYPES = (
    ('booking_created',     'Booking Created'),
    ('booking_assigned',    'Booking Assigned'),
    ('booking_in_progress', 'Booking In Progress'),
    ('booking_completed',   'Booking Completed'),
    ('booking_cancelled',   'Booking Cancelled'),
    ('invoice_created',     'Invoice Created'),
    ('payment_received',    'Payment Received'),
    ('low_stock',           'Low Stock Alert'),
    ('purchase_received',   'Purchase Received'),
    ('user_created',        'User Created'),
    ('permission_changed',  'Permission Changed'),
    ('system',              'System'),
)

ENTITY_TYPES = (
    ('booking',   'Booking'),
    ('invoice',   'Invoice'),
    ('customer',  'Customer'),
    ('product',   'Product'),
    ('technician','Technician'),
    ('user',      'User'),
    ('',          'None'),
)


class Notification(BaseModel):
    user              = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    shop              = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    title             = models.CharField(max_length=255)
    message           = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIF_TYPES, default='system')
    entity_type       = models.CharField(max_length=50, choices=ENTITY_TYPES, blank=True, default='')
    entity_id         = models.CharField(max_length=100, blank=True, default='')
    action_url        = models.CharField(max_length=500, blank=True, default='')
    is_read           = models.BooleanField(default=False)
    read_at           = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['shop', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} → {self.user.email}"
