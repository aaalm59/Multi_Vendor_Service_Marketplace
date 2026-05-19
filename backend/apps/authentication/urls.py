from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.authentication.views import CustomTokenObtainPairView, AuthViewSet
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'', AuthViewSet, basename='auth')

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
] + router.urls
