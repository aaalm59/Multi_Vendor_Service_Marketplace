from rest_framework.routers import DefaultRouter
from apps.services.views import ServiceViewSet, ServiceCategoryViewSet

router = DefaultRouter()
router.register(r'categories', ServiceCategoryViewSet, basename='service-categories')
router.register(r'', ServiceViewSet, basename='services')

urlpatterns = router.urls
