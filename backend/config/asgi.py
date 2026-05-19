import os
import django
from channels.routing import ProtocolTypeRouter
from channels.auth import AuthMiddlewareStack
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

asgi_application = get_asgi_application()

application = ProtocolTypeRouter({
    'http': asgi_application,
})
