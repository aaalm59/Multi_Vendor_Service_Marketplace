from rest_framework import viewsets
from rest_framework.serializers import ModelSerializer
from apps.services.models import Service
from apps.users.permissions import ALL_AUTH_ROLES, HasRolePermission, MANAGER_ROLES
from apps.shops.views import TenantScopedViewSetMixin

class ServiceSerializer(ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class ServiceViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """Service management API"""
    queryset = Service.objects.filter(is_available=True)
    serializer_class = ServiceSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'services'
    allowed_roles_by_action = {
        'read': ALL_AUTH_ROLES,
        'write': MANAGER_ROLES,
    }
    filterset_fields = ['name']
    search_fields = ['name', 'description']

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'customer':
            queryset = Service.objects.filter(is_available=True)
            shop_id = self.request.query_params.get('shop')
            if shop_id:
                return queryset.filter(shop_id=shop_id)
            return queryset
        queryset = super().get_queryset()
        return queryset
