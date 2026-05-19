from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.suppliers.views import SupplierViewSet, PurchaseViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='suppliers')
router.register(r'purchases', PurchaseViewSet, basename='purchases')

urlpatterns = router.urls
