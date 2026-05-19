from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.reports.views import ReportViewSet, DailyMetricsViewSet

router = DefaultRouter()
router.register(r'reports', ReportViewSet, basename='reports')
router.register(r'daily-metrics', DailyMetricsViewSet, basename='daily_metrics')

urlpatterns = router.urls
