from rest_framework import viewsets
from rest_framework.serializers import ModelSerializer
from apps.services.models import Service
from apps.users.permissions import ALL_AUTH_ROLES, HasRolePermission, MANAGER_ROLES

class ServiceSerializer(ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class ServiceViewSet(viewsets.ModelViewSet):
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
