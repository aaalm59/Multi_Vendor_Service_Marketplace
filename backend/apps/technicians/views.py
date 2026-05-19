from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.technicians.models import Technician, TechnicianAvailability
from rest_framework.serializers import ModelSerializer
from apps.users.serializers import UserDetailSerializer
from apps.users.permissions import HasRolePermission, MANAGER_ROLES, SERVICE_ROLES

class TechnicianSerializer(ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['user'] = UserDetailSerializer(instance.user).data
        return data

    class Meta:
        model = Technician
        fields = '__all__'

class TechnicianViewSet(viewsets.ModelViewSet):
    """Technician management API"""
    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'technicians'
    allowed_roles_by_action = {
        'read': MANAGER_ROLES | SERVICE_ROLES,
        'available': MANAGER_ROLES,
        'by_specialization': MANAGER_ROLES,
        'availability': MANAGER_ROLES | SERVICE_ROLES,
        'write': MANAGER_ROLES,
    }
    filterset_fields = ['availability_status']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'specialization']
    ordering_fields = ['average_rating', 'completed_bookings', 'experience_years', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self.request.user, 'role', None) == 'technician':
            return queryset.filter(user=self.request.user)
        return queryset
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Get available technicians"""
        technicians = Technician.objects.filter(availability_status='available')
        serializer = self.get_serializer(technicians, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_specialization(self, request):
        """Get technicians by specialization"""
        spec = request.query_params.get('specialization')
        if not spec:
            return Response({'error': 'Specialization required'}, status=status.HTTP_400_BAD_REQUEST)
        
        technicians = Technician.objects.filter(specialization__icontains=spec)
        serializer = self.get_serializer(technicians, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        """Get technician availability"""
        technician = self.get_object()
        availability = TechnicianAvailability.objects.filter(technician=technician, is_available=True)
        from rest_framework.serializers import ModelSerializer
        
        class AvailabilitySerializer(ModelSerializer):
            class Meta:
                model = TechnicianAvailability
                fields = ['date', 'start_time', 'end_time']
        
        serializer = AvailabilitySerializer(availability, many=True)
        return Response(serializer.data)
