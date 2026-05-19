from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer
from apps.services.models import Service

class ServiceSerializer(ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class ServiceViewSet(viewsets.ModelViewSet):
    """Service management API"""
    queryset = Service.objects.filter(is_available=True)
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['name']
    search_fields = ['name', 'description']
