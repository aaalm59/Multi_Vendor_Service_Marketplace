from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.staff.views import StaffViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = router.urls
