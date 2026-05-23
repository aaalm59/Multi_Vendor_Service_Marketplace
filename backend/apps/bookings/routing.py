from django.urls import re_path
from apps.bookings.consumers import BookingChatConsumer
from apps.bookings.call_consumer import UserCallConsumer
from apps.notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    re_path(r'^ws/booking/(?P<booking_id>[^/]+)/chat/$', BookingChatConsumer.as_asgi()),
    re_path(r'^ws/user/call/$', UserCallConsumer.as_asgi()),
    re_path(r'^ws/notifications/$', NotificationConsumer.as_asgi()),
]
