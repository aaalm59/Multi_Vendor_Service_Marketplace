from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.billing.views import InvoiceViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'payments', PaymentViewSet, basename='payments')

urlpatterns = router.urls
