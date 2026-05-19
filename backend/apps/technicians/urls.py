from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.technicians.views import TechnicianViewSet

router = DefaultRouter()
router.register(r'', TechnicianViewSet, basename='technicians')

urlpatterns = router.urls
