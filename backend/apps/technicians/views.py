from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.technicians.models import Technician, TechnicianAvailability
from rest_framework.serializers import ModelSerializer

class TechnicianSerializer(ModelSerializer):
    class Meta:
        model = Technician
        fields = '__all__'

class TechnicianViewSet(viewsets.ModelViewSet):
    """Technician management API"""
    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer
    permission_classes = [IsAuthenticated]
    
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
