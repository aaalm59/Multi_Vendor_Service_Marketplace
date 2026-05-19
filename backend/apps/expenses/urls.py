from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.expenses.views import ExpenseViewSet, ExpenseCategoryViewSet

router = DefaultRouter()
router.register(r'categories', ExpenseCategoryViewSet, basename='categories')
router.register(r'', ExpenseViewSet, basename='expenses')

urlpatterns = router.urls
