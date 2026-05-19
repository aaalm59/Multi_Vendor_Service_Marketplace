from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.notifications.views import NotificationViewSet

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notifications')

urlpatterns = router.urls
