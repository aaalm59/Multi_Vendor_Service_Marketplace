from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer
from apps.bookings.models import Booking
from apps.customers.serializers import CustomerDetailSerializer
from apps.technicians.views import TechnicianSerializer
from apps.services.views import ServiceSerializer

class BookingSerializer(ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['customer'] = CustomerDetailSerializer(instance.customer).data
        data['service'] = ServiceSerializer(instance.service).data if instance.service else None
        data['technician'] = TechnicianSerializer(instance.technician).data if instance.technician else None
        return data

    class Meta:
        model = Booking
        fields = '__all__'

class BookingViewSet(viewsets.ModelViewSet):
    """Booking management API"""
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['customer', 'technician', 'status']
    
    @action(detail=True, methods=['post'])
    def assign_technician(self, request, pk=None):
        """Assign technician to booking"""
        booking = self.get_object()
        technician_id = request.data.get('technician_id')
        
        if not technician_id:
            return Response({'error': 'Technician ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.technicians.models import Technician
        try:
            technician = Technician.objects.get(id=technician_id)
            booking.technician = technician
            booking.status = 'assigned'
            booking.save()
            
            serializer = self.get_serializer(booking)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Technician.DoesNotExist:
            return Response({'error': 'Technician not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark booking as completed"""
        booking = self.get_object()
        booking.status = 'completed'
        from datetime import datetime
        booking.completion_date = datetime.now()
        booking.final_amount = request.data.get('final_amount', booking.quote_amount)
        booking.save()
        
        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)
