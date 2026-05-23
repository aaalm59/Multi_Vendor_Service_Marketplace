import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser


class NotificationConsumer(AsyncWebsocketConsumer):
    """Per-user WebSocket channel for real-time notifications."""

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f'notifications_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Client can send {"type": "mark_read", "id": "<notif_id>"}
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get('type') == 'mark_read' and data.get('id'):
            await self._mark_read(data['id'])

    async def notification_message(self, event):
        """Relay a notification pushed via channel layer to this WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            **event['data'],
        }))

    from channels.db import database_sync_to_async

    @database_sync_to_async
    def _mark_read(self, notif_id):
        from apps.notifications.models import Notification
        from django.utils import timezone
        Notification.objects.filter(id=notif_id, user=self.user).update(
            is_read=True, read_at=timezone.now()
        )
