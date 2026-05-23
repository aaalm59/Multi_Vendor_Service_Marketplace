"""
Notification service — creates DB records and pushes real-time WS events.

Usage:
    from apps.notifications.service import notify
    notify(users=[user1, user2], title="...", message="...", notif_type="booking_created",
           entity_type="booking", entity_id=str(booking.id), action_url="/bookings",
           shop=booking.shop)
"""
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def _push_ws(user_id, payload: dict):
    """Push a notification payload to the per-user WebSocket group."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {'type': 'notification_message', 'data': payload},
        )
    except Exception as exc:
        logger.warning("WS push failed for user %s: %s", user_id, exc)


def notify(users, title: str, message: str, notif_type: str = 'system',
           entity_type: str = '', entity_id: str = '', action_url: str = '',
           shop=None):
    """
    Create one Notification per user and push to their WS channel.
    `users` may be a single User instance or an iterable of User instances.
    Returns the list of created Notification objects.
    """
    from apps.notifications.models import Notification

    if not hasattr(users, '__iter__') or hasattr(users, 'id'):
        users = [users]

    created = []
    for user in users:
        if user is None:
            continue
        try:
            n = Notification.objects.create(
                user=user,
                shop=shop,
                title=title,
                message=message,
                notification_type=notif_type,
                entity_type=entity_type,
                entity_id=entity_id,
                action_url=action_url,
            )
            payload = {
                'id':                str(n.id),
                'title':             n.title,
                'message':           n.message,
                'notification_type': n.notification_type,
                'entity_type':       n.entity_type,
                'entity_id':         n.entity_id,
                'action_url':        n.action_url,
                'is_read':           False,
                'created_at':        n.created_at.isoformat(),
            }
            _push_ws(user.id, payload)
            created.append(n)
        except Exception as exc:
            logger.error("Failed to create notification for user %s: %s", getattr(user, 'id', '?'), exc)

    return created


# ── Convenience helpers ──────────────────────────────────────────────────────

def notify_booking_created(booking):
    """Notify shop owner + managers when a new booking arrives."""
    from apps.users.models import User
    from apps.users.permissions import ADMIN, SOP_USER, MANAGER

    customer_name = 'Unknown'
    if booking.customer and booking.customer.user:
        customer_name = booking.customer.user.get_full_name() or booking.customer.user.email

    recipients = list(
        User.objects.filter(
            role__in=[ADMIN, SOP_USER, MANAGER],
            is_active=True,
        ).exclude(id=booking.customer.user_id if booking.customer else None)
    )
    if booking.shop:
        shop_staff = list(
            User.objects.filter(shop=booking.shop, is_active=True)
            .exclude(role=ADMIN)
            .exclude(id=booking.customer.user_id if booking.customer else None)
        )
        recipients = list({u.id: u for u in recipients + shop_staff}.values())

    notify(
        users=recipients,
        title='New Booking Received',
        message=f'New service booking from {customer_name} — #{booking.booking_number}',
        notif_type='booking_created',
        entity_type='booking',
        entity_id=str(booking.id),
        action_url='/bookings',
        shop=booking.shop,
    )


def notify_technician_assigned(booking):
    """Notify technician + customer when a technician is assigned."""
    from apps.users.models import User

    tech_name = 'A technician'
    if booking.technician and booking.technician.user:
        tech_name = booking.technician.user.get_full_name() or 'A technician'

    recipients = []

    # Notify the technician
    if booking.technician and booking.technician.user:
        notify(
            users=[booking.technician.user],
            title='New Job Assigned',
            message=f'You have been assigned booking #{booking.booking_number}.',
            notif_type='booking_assigned',
            entity_type='booking',
            entity_id=str(booking.id),
            action_url='/technician/jobs',
            shop=booking.shop,
        )

    # Notify the customer
    if booking.customer and booking.customer.user:
        notify(
            users=[booking.customer.user],
            title='Technician Assigned',
            message=f'{tech_name} has been assigned to your booking #{booking.booking_number}.',
            notif_type='booking_assigned',
            entity_type='booking',
            entity_id=str(booking.id),
            action_url='/bookings',
            shop=booking.shop,
        )


def notify_status_changed(booking, old_status, new_status):
    """Notify customer + shop owner when booking status changes."""
    from apps.users.models import User
    from apps.users.permissions import ADMIN, SOP_USER, MANAGER

    STATUS_LABELS = {
        'in_progress': 'In Progress',
        'completed':   'Completed',
        'cancelled':   'Cancelled',
        'assigned':    'Assigned',
        'pending':     'Pending',
    }
    label = STATUS_LABELS.get(new_status, new_status.title())

    notif_type_map = {
        'in_progress': 'booking_in_progress',
        'completed':   'booking_completed',
        'cancelled':   'booking_cancelled',
    }
    notif_type = notif_type_map.get(new_status, 'system')

    # Notify customer
    if booking.customer and booking.customer.user:
        notify(
            users=[booking.customer.user],
            title=f'Booking {label}',
            message=f'Your booking #{booking.booking_number} is now {label}.',
            notif_type=notif_type,
            entity_type='booking',
            entity_id=str(booking.id),
            action_url='/bookings',
            shop=booking.shop,
        )

    # Notify shop owner + admins
    admin_recipients = list(
        User.objects.filter(role__in=[ADMIN, SOP_USER, MANAGER], is_active=True)
    )
    if booking.shop:
        shop_staff = list(User.objects.filter(shop=booking.shop, is_active=True).exclude(role=ADMIN))
        admin_recipients = list({u.id: u for u in admin_recipients + shop_staff}.values())

    # Don't double-notify the customer
    customer_user_id = booking.customer.user_id if booking.customer else None
    admin_recipients = [u for u in admin_recipients if u.id != customer_user_id]

    if admin_recipients:
        tech_name = ''
        if booking.technician and booking.technician.user:
            tech_name = f' by {booking.technician.user.get_full_name()}'
        notify(
            users=admin_recipients,
            title=f'Booking {label}',
            message=f'Booking #{booking.booking_number}{tech_name} is now {label}.',
            notif_type=notif_type,
            entity_type='booking',
            entity_id=str(booking.id),
            action_url='/bookings',
            shop=booking.shop,
        )


def notify_invoice_created(invoice):
    """Notify customer + shop owner when invoice is generated."""
    from apps.users.models import User
    from apps.users.permissions import ADMIN, SOP_USER, MANAGER

    amount = f"₹{float(invoice.total_amount):,.2f}"

    # Notify customer
    if invoice.customer and invoice.customer.user:
        notify(
            users=[invoice.customer.user],
            title='Invoice Generated',
            message=f'Invoice #{invoice.invoice_number} for {amount} has been created.',
            notif_type='invoice_created',
            entity_type='invoice',
            entity_id=str(invoice.id),
            action_url='/billing',
            shop=invoice.shop,
        )

    # Notify shop staff
    recipients = list(
        User.objects.filter(role__in=[ADMIN, SOP_USER, MANAGER], is_active=True)
    )
    if invoice.shop:
        shop_staff = list(User.objects.filter(shop=invoice.shop, is_active=True).exclude(role=ADMIN))
        recipients = list({u.id: u for u in recipients + shop_staff}.values())
    customer_user_id = invoice.customer.user_id if invoice.customer else None
    recipients = [u for u in recipients if u.id != customer_user_id]
    if recipients:
        customer_name = invoice.customer.user.get_full_name() if invoice.customer and invoice.customer.user else 'Walk-in'
        notify(
            users=recipients,
            title='New Invoice Created',
            message=f'Invoice #{invoice.invoice_number} ({amount}) for {customer_name}.',
            notif_type='invoice_created',
            entity_type='invoice',
            entity_id=str(invoice.id),
            action_url='/billing',
            shop=invoice.shop,
        )


def notify_low_stock(product, inventory):
    """Notify inventory staff + shop owner about low stock."""
    from apps.users.models import User
    from apps.users.permissions import ADMIN, SOP_USER, MANAGER, INVENTORY_STAFF

    qty = inventory.quantity_on_hand
    msg = (
        f'"{product.name}" is out of stock!' if qty == 0
        else f'"{product.name}" stock is low ({qty} remaining, reorder level: {inventory.reorder_level}).'
    )

    recipients = list(
        User.objects.filter(role__in=[ADMIN, SOP_USER, MANAGER, INVENTORY_STAFF], is_active=True)
    )
    if product.shop:
        shop_staff = list(User.objects.filter(shop=product.shop, is_active=True).exclude(role=ADMIN))
        recipients = list({u.id: u for u in recipients + shop_staff}.values())

    notify(
        users=recipients,
        title='Low Stock Alert' if qty > 0 else 'Out of Stock',
        message=msg,
        notif_type='low_stock',
        entity_type='product',
        entity_id=str(product.id),
        action_url='/inventory',
        shop=product.shop,
    )
