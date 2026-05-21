from rest_framework.routers import DefaultRouter

from apps.shops.views import ShopViewSet

router = DefaultRouter()
router.register(r'', ShopViewSet, basename='shops')

urlpatterns = router.urls
