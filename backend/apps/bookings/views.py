from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from apps.bookings.models import Booking
from apps.customers.serializers import CustomerDetailSerializer
from apps.technicians.views import TechnicianSerializer
from apps.services.views import ServiceSerializer
from apps.users.permissions import CUSTOMER, HasRolePermission, MANAGER_ROLES, SERVICE_ROLES

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
        read_only_fields = ['id', 'booking_number', 'completion_date', 'created_at', 'updated_at']

class BookingViewSet(viewsets.ModelViewSet):
    """Booking management API"""
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'read': MANAGER_ROLES | SERVICE_ROLES | {CUSTOMER},
        'create': MANAGER_ROLES | {CUSTOMER},
        'assign_technician': MANAGER_ROLES,
        'mark_completed': MANAGER_ROLES | SERVICE_ROLES,
        'write': MANAGER_ROLES,
    }
    filterset_fields = ['customer', 'technician', 'status']
    search_fields = ['booking_number', 'customer__user__first_name', 'customer__user__last_name', 'customer__user__phone', 'service__name']
    ordering_fields = ['created_at', 'booking_date', 'scheduled_date', 'final_amount']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if getattr(user, 'role', None) == CUSTOMER:
            return queryset.filter(customer__user=user)
        if getattr(user, 'role', None) == 'technician':
            return queryset.filter(technician__user=user)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, 'role', None) == CUSTOMER and hasattr(user, 'customer_profile'):
            serializer.save(customer=user.customer_profile)
            return
        serializer.save()
    
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
