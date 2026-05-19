"""
Auto-recalculate Customer.total_bookings, total_spent, average_rating
whenever Bookings or Invoices change.
"""
from django.db.models import Sum, Avg, Count
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


def _refresh_customer(customer):
    from apps.bookings.models import Booking

    agg = Booking.objects.filter(customer=customer).aggregate(
        total=Count('id'),
        avg_rating=Avg('rating'),
    )
    spent_agg = customer.invoices.aggregate(total=Sum('total_amount'))

    customer.total_bookings = agg['total'] or 0
    customer.average_rating = round(agg['avg_rating'] or 0, 2)
    customer.total_spent = spent_agg['total'] or 0
    customer.save(update_fields=['total_bookings', 'average_rating', 'total_spent'])


@receiver(post_save, sender='bookings.Booking')
def booking_saved(sender, instance, **kwargs):
    try:
        _refresh_customer(instance.customer)
    except Exception:
        pass


@receiver(post_delete, sender='bookings.Booking')
def booking_deleted(sender, instance, **kwargs):
    try:
        _refresh_customer(instance.customer)
    except Exception:
        pass


@receiver(post_save, sender='billing.Invoice')
def invoice_saved(sender, instance, **kwargs):
    if instance.customer:
        try:
            _refresh_customer(instance.customer)
        except Exception:
            pass


@receiver(post_delete, sender='billing.Invoice')
def invoice_deleted(sender, instance, **kwargs):
    if instance.customer:
        try:
            _refresh_customer(instance.customer)
        except Exception:
            pass
