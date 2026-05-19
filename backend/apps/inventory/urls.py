from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.inventory.views import ProductViewSet, ProductCategoryViewSet, InventoryViewSet, StockMovementViewSet

router = DefaultRouter()
router.register(r'categories', ProductCategoryViewSet, basename='categories')
router.register(r'products', ProductViewSet, basename='products')
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'stock-movements', StockMovementViewSet, basename='stock_movements')

urlpatterns = router.urls
