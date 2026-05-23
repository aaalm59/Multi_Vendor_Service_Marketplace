from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer, SerializerMethodField
from django.utils import timezone
from apps.notifications.models import Notification


class NotificationSerializer(ModelSerializer):
    time_ago = SerializerMethodField()

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'entity_type', 'entity_id', 'action_url',
            'is_read', 'read_at', 'created_at', 'time_ago',
        ]
        read_only_fields = fields


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        notif_type = self.request.query_params.get('type')
        is_read = self.request.query_params.get('is_read')
        if notif_type:
            qs = qs.filter(notification_type=notif_type)
        if is_read is not None:
            qs = qs.filter(is_read=(is_read.lower() == 'true'))
        return qs

    @action(detail=False, methods=['get'])
    def unread(self, request):
        qs = Notification.objects.filter(user=request.user, is_read=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        n = self.get_object()
        n.is_read = True
        n.read_at = timezone.now()
        n.save(update_fields=['is_read', 'read_at'])
        return Response(self.get_serializer(n).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({'marked': updated})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        deleted, _ = Notification.objects.filter(user=request.user, is_read=True).delete()
        return Response({'deleted': deleted})
