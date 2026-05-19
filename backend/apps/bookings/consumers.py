import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class BookingChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for booking chat between customer, technician, and managers."""

    async def connect(self):
        self.booking_id = self.scope['url_route']['kwargs']['booking_id']
        self.room_group_name = f'booking_chat_{self.booking_id}'
        self.user = self.scope.get('user')

        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        allowed = await self._check_access()
        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        # Stop typing indicator if user disconnects while typing
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'typing_event',
                'user_id': str(self.user.id) if self.user else None,
                'sender_name': '',
                'is_typing': False,
            })

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')

        if msg_type == 'chat_message':
            text = data.get('message', '').strip()
            if not text:
                return
            msg = await self._save_message(text)
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'chat_message',
                'id': str(msg.id),
                'sender': str(msg.sender_id),
                'sender_name': msg.sender.get_full_name(),
                'sender_role': msg.sender.role,
                'message': msg.message,
                'is_read': msg.is_read,
                'created_at': msg.created_at.isoformat(),
            })

        elif msg_type == 'typing':
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'typing_event',
                'user_id': str(self.user.id),
                'sender_name': self.user.get_full_name(),
                'is_typing': data.get('is_typing', False),
            })

        elif msg_type in ('call_offer', 'call_answer', 'ice_candidate', 'call_reject', 'call_end'):
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'signaling_event',
                'signal_type': msg_type,
                'from_user': str(self.user.id),
                'from_name': self.user.get_full_name(),
                'payload': data.get('payload'),
                'call_type': data.get('call_type', 'audio'),
            })

    # ── Group message handlers ──────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['id'],
            'sender': event['sender'],
            'sender_name': event['sender_name'],
            'sender_role': event['sender_role'],
            'message': event.get('message', ''),
            'attachment': event.get('attachment'),
            'attachment_name': event.get('attachment_name', ''),
            'is_read': event['is_read'],
            'created_at': event['created_at'],
        }))

    async def signaling_event(self, event):
        if event.get('from_user') == str(self.user.id):
            return  # Don't reflect back to sender
        await self.send(text_data=json.dumps({
            'type': event['signal_type'],
            'from_user': event['from_user'],
            'from_name': event['from_name'],
            'payload': event.get('payload'),
            'call_type': event.get('call_type', 'audio'),
        }))

    async def typing_event(self, event):
        # Don't send the user's own typing indicator back to themselves
        if event.get('user_id') == (str(self.user.id) if self.user else None):
            return
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_name': event['sender_name'],
            'is_typing': event['is_typing'],
        }))

    # ── DB helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def _check_access(self):
        from apps.bookings.models import Booking
        from apps.users.permissions import CUSTOMER, TECHNICIAN, MANAGER_ROLES
        try:
            booking = Booking.objects.select_related(
                'customer__user', 'technician__user'
            ).get(id=self.booking_id)
        except Booking.DoesNotExist:
            return False

        role = getattr(self.user, 'role', None)
        if role in MANAGER_ROLES:
            return True
        if role == CUSTOMER:
            return (
                hasattr(self.user, 'customer_profile')
                and booking.customer == self.user.customer_profile
            )
        if role == TECHNICIAN:
            return (
                hasattr(self.user, 'technician_profile')
                and booking.technician == self.user.technician_profile
            )
        return False

    @database_sync_to_async
    def _save_message(self, text):
        from apps.bookings.models import Booking, BookingMessage
        booking = Booking.objects.get(id=self.booking_id)
        msg = BookingMessage.objects.create(booking=booking, sender=self.user, message=text)
        # Refresh to get sender relation loaded
        msg.sender = self.user
        return msg
