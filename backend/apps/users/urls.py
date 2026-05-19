from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.users.views import UserViewSet, ActivityLogViewSet

router = DefaultRouter()
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-logs')
router.register(r'', UserViewSet, basename='users')

urlpatterns = router.urls
