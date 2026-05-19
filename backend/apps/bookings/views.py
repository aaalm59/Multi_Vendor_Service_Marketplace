from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from apps.bookings.models import Booking, RepairImage
from apps.customers.serializers import CustomerDetailSerializer
from apps.technicians.views import TechnicianSerializer
from apps.services.views import ServiceSerializer
from apps.users.permissions import CUSTOMER, TECHNICIAN, HasRolePermission, MANAGER_ROLES, SERVICE_ROLES


class RepairImageSerializer(ModelSerializer):
    class Meta:
        model = RepairImage
        fields = ['id', 'image', 'caption', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']


class BookingSerializer(ModelSerializer):
    repair_images = RepairImageSerializer(many=True, read_only=True)

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
    permission_module = 'bookings'
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    allowed_roles_by_action = {
        'read': MANAGER_ROLES | SERVICE_ROLES | {CUSTOMER},
        'create': MANAGER_ROLES | {CUSTOMER},
        'assign_technician': MANAGER_ROLES,
        'mark_completed': MANAGER_ROLES | SERVICE_ROLES,
        'update_status': MANAGER_ROLES | {TECHNICIAN},
        'upload_repair_image': MANAGER_ROLES | {TECHNICIAN},
        'add_note': MANAGER_ROLES | {TECHNICIAN},
        'repair_images': MANAGER_ROLES | SERVICE_ROLES,
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

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Technician updates job status (in_progress or completed)."""
        booking = self.get_object()
        user = request.user
        if user.role == TECHNICIAN:
            if not hasattr(user, 'technician_profile') or booking.technician != user.technician_profile:
                return Response({'error': 'You are not assigned to this booking'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        allowed_statuses = ['in_progress', 'completed', 'assigned', 'pending', 'cancelled']
        if new_status not in allowed_statuses:
            return Response({'error': f'Invalid status. Choose from: {allowed_statuses}'}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = new_status
        if new_status == 'completed':
            from datetime import datetime
            booking.completion_date = datetime.now()
            if request.data.get('final_amount'):
                booking.final_amount = request.data['final_amount']
        booking.save()
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload_repair_image')
    def upload_repair_image(self, request, pk=None):
        """Upload a repair photo for this booking."""
        booking = self.get_object()
        user = request.user
        if user.role == TECHNICIAN:
            if not hasattr(user, 'technician_profile') or booking.technician != user.technician_profile:
                return Response({'error': 'You are not assigned to this booking'}, status=status.HTTP_403_FORBIDDEN)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)

        repair_image = RepairImage.objects.create(
            booking=booking,
            image=image_file,
            caption=request.data.get('caption', ''),
            uploaded_by=user,
        )
        return Response(RepairImageSerializer(repair_image).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Append a technician note to booking notes field."""
        booking = self.get_object()
        user = request.user
        if user.role == TECHNICIAN:
            if not hasattr(user, 'technician_profile') or booking.technician != user.technician_profile:
                return Response({'error': 'You are not assigned to this booking'}, status=status.HTTP_403_FORBIDDEN)

        note = request.data.get('note', '').strip()
        if not note:
            return Response({'error': 'Note cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        import datetime
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        new_note = f"[{timestamp}] {user.get_full_name()}: {note}"
        booking.notes = f"{booking.notes}\n{new_note}".strip() if booking.notes else new_note
        booking.save()
        return Response({'notes': booking.notes}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def repair_images(self, request, pk=None):
        """List all repair images for a booking."""
        booking = self.get_object()
        images = RepairImage.objects.filter(booking=booking)
        return Response(RepairImageSerializer(images, many=True, context={'request': request}).data)
