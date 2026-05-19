import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache


PENDING_CALL_TTL_SECONDS = 120


def _pending_call_key(user_id):
    return f'pending_call:{user_id}'


class UserCallConsumer(AsyncWebsocketConsumer):
    """
    Per-user persistent WebSocket for WebRTC call signaling.
    URL: /ws/user/call/?token=<jwt>

    Each authenticated user connects to their own channel group
    `user_call_{user_id}`.  Callers forward offer/answer/ICE/reject/end
    to the other party by sending { ..., "to_user": "<uuid>" }.
    """

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        self.user_group = f'user_call_{self.user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        pending_call = await self._get_pending_call(str(self.user.id))
        if pending_call:
            await self.call_signal({
                'signal_type': 'call_offer',
                **pending_call,
            })

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')
        to_user_id = data.get('to_user')

        if msg_type in ('call_offer', 'call_answer', 'ice_candidate', 'call_reject', 'call_end') and to_user_id:
            if msg_type == 'call_offer':
                await self._store_pending_call(str(to_user_id), data)
            elif msg_type == 'ice_candidate':
                await self._append_pending_ice_candidate(str(to_user_id), data.get('payload'))
            elif msg_type in ('call_answer', 'call_reject'):
                await self._clear_pending_call(str(self.user.id))
            elif msg_type == 'call_end':
                await self._clear_pending_call(str(to_user_id))
                await self._clear_pending_call(str(self.user.id))

            await self.channel_layer.group_send(
                f'user_call_{to_user_id}',
                {
                    'type': 'call_signal',
                    'signal_type': msg_type,
                    'from_user': str(self.user.id),
                    'from_name': self.user.get_full_name(),
                    'payload': data.get('payload'),
                    'call_type': data.get('call_type', 'audio'),
                    'booking_id': str(data.get('booking_id', '')),
                    'booking_number': data.get('booking_number', ''),
                    'to_user': str(to_user_id),
                }
            )

    async def call_signal(self, event):
        # Don't reflect back to sender
        if event.get('from_user') == str(self.user.id):
            return
        await self.send(text_data=json.dumps({
            'type': event['signal_type'],
            'from_user': event['from_user'],
            'from_name': event['from_name'],
            'payload': event.get('payload'),
            'call_type': event.get('call_type', 'audio'),
            'booking_id': event.get('booking_id', ''),
            'booking_number': event.get('booking_number', ''),
            'to_user': event.get('to_user', ''),
            'ice_candidates': event.get('ice_candidates', []),
        }))

    @database_sync_to_async
    def _store_pending_call(self, to_user_id, data):
        cache.set(
            _pending_call_key(to_user_id),
            {
                'from_user': str(self.user.id),
                'from_name': self.user.get_full_name(),
                'payload': data.get('payload'),
                'call_type': data.get('call_type', 'audio'),
                'booking_id': str(data.get('booking_id', '')),
                'booking_number': data.get('booking_number', ''),
                'to_user': str(to_user_id),
                'ice_candidates': [],
            },
            timeout=PENDING_CALL_TTL_SECONDS,
        )

    @database_sync_to_async
    def _append_pending_ice_candidate(self, to_user_id, candidate):
        if not candidate:
            return
        key = _pending_call_key(to_user_id)
        pending_call = cache.get(key)
        if not pending_call:
            return
        pending_call.setdefault('ice_candidates', []).append(candidate)
        cache.set(key, pending_call, timeout=PENDING_CALL_TTL_SECONDS)

    @database_sync_to_async
    def _get_pending_call(self, user_id):
        return cache.get(_pending_call_key(user_id))

    @database_sync_to_async
    def _clear_pending_call(self, user_id):
        cache.delete(_pending_call_key(user_id))
