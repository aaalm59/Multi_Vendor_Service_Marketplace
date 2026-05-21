"""
URL configuration for the project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import AllowAny

API_VERSION = 'v1'

# API URLs
api_patterns = [
    path('auth/', include(('apps.authentication.urls', 'auth'), namespace='auth')),
    path('shops/', include(('apps.shops.urls', 'shops'), namespace='shops')),
    path('users/', include(('apps.users.urls', 'users'), namespace='users')),
    path('customers/', include(('apps.customers.urls', 'customers'), namespace='customers')),
    path('technicians/', include(('apps.technicians.urls', 'technicians'), namespace='technicians')),
    path('staff/', include(('apps.staff.urls', 'staff'), namespace='staff')),
    path('services/', include(('apps.services.urls', 'services'), namespace='services')),
    path('bookings/', include(('apps.bookings.urls', 'bookings'), namespace='bookings')),
    path('inventory/', include(('apps.inventory.urls', 'inventory'), namespace='inventory')),
    path('billing/', include(('apps.billing.urls', 'billing'), namespace='billing')),
    path('suppliers/', include(('apps.suppliers.urls', 'suppliers'), namespace='suppliers')),
    path('expenses/', include(('apps.expenses.urls', 'expenses'), namespace='expenses')),
    path('reports/', include(('apps.reports.urls', 'reports'), namespace='reports')),
    path('notifications/', include(('apps.notifications.urls', 'notifications'), namespace='notifications')),
]

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path(f'api/{API_VERSION}/', include(api_patterns)),
    
    # Swagger & OpenAPI Documentation
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[AllowAny]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[AllowAny]), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema', permission_classes=[AllowAny]), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
