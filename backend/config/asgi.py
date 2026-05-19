import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from apps.bookings.routing import websocket_urlpatterns
from config.ws_middleware import JwtAuthMiddleware

asgi_application = get_asgi_application()

application = ProtocolTypeRouter({
    'http': asgi_application,
    'websocket': AllowedHostsOriginValidator(
        JwtAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
