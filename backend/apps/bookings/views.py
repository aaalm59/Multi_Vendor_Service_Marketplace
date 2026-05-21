from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from apps.bookings.models import Booking, RepairImage, BookingMessage
from apps.customers.serializers import CustomerDetailSerializer
from apps.technicians.views import TechnicianSerializer
from apps.services.views import ServiceSerializer
from apps.users.permissions import CUSTOMER, TECHNICIAN, HasRolePermission, MANAGER_ROLES, SERVICE_ROLES
from apps.users.audit import AuditLoggingMixin
from apps.users.models import ActivityLog
from apps.shops.models import Shop
from apps.shops.views import tenant_queryset


class BookingMessageSerializer(ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = BookingMessage
        fields = ['id', 'sender', 'sender_name', 'sender_role', 'message',
                  'attachment', 'attachment_name', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'sender_name', 'sender_role', 'is_read', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name()

    def get_sender_role(self, obj):
        return obj.sender.role


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
        data['shop_name'] = instance.shop.name if instance.shop else ''
        return data

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['id', 'booking_number', 'completion_date', 'created_at', 'updated_at']
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'scheduled_date': {'required': False, 'allow_null': True},
            'scheduled_time': {'required': False, 'allow_null': True},
            'quote_amount': {'required': False, 'allow_null': True},
            'landmark': {'required': False, 'allow_blank': True},
            'area': {'required': False, 'allow_blank': True},
            'city': {'required': False, 'allow_blank': True},
            'pincode': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        shop = attrs.get('shop') or getattr(self.instance, 'shop', None)
        service = attrs.get('service') or getattr(self.instance, 'service', None)
        technician = attrs.get('technician') or getattr(self.instance, 'technician', None)
        if shop and service and service.shop_id and service.shop_id != shop.id:
            raise serializers.ValidationError({'service': 'Service belongs to another shop.'})
        if shop and technician and technician.shop_id and technician.shop_id != shop.id:
            raise serializers.ValidationError({'technician': 'Technician belongs to another shop.'})
        return attrs

class BookingViewSet(AuditLoggingMixin, viewsets.ModelViewSet):
    audit_module = 'bookings'
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
        'cancel_booking': MANAGER_ROLES | {CUSTOMER},
        'submit_review': MANAGER_ROLES | {CUSTOMER},
        'messages': MANAGER_ROLES | {CUSTOMER, TECHNICIAN},
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
        return tenant_queryset(queryset, user)

    def perform_create(self, serializer):
        user = self.request.user
        shop = None
        shop_id = self.request.data.get('shop')
        if getattr(user, 'role', None) == CUSTOMER:
            if not shop_id:
                raise serializers.ValidationError({'shop': 'Shop selection is required.'})
            try:
                shop = Shop.objects.get(id=shop_id, status='approved', is_active=True)
            except Shop.DoesNotExist:
                raise serializers.ValidationError({'shop': 'Selected shop is not available.'})
            if not hasattr(user, 'customer_profile'):
                # Auto-create a minimal Customer profile so the booking can proceed
                from apps.customers.models import Customer
                profile = Customer.objects.create(
                    user=user, address='', city='', state='', postal_code=''
                )
            else:
                profile = user.customer_profile
            serializer.save(customer=profile, shop=shop)
            return
        if getattr(user, 'role', None) != 'admin' and not user.is_superuser:
            shop = getattr(user, 'shop', None)
        elif shop_id:
            shop = Shop.objects.filter(id=shop_id).first()
        service = serializer.validated_data.get('service')
        if shop and service and service.shop_id and service.shop_id != shop.id:
            raise serializers.ValidationError({'service': 'Service belongs to another shop.'})
        serializer.save(shop=shop)
    
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
            if booking.shop_id and technician.shop_id and booking.shop_id != technician.shop_id:
                return Response({'error': 'Technician belongs to another shop'}, status=status.HTTP_400_BAD_REQUEST)
            booking.technician = technician
            booking.status = 'assigned'
            booking.save()
            ActivityLog.log(request.user, 'assign', 'bookings',
                f"Assigned technician {technician.user.get_full_name()} to booking {booking.booking_number}",
                request=request, object_id=booking.pk)
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

        old_status = booking.status
        booking.status = new_status
        if new_status == 'completed':
            from datetime import datetime
            booking.completion_date = datetime.now()
            if request.data.get('final_amount'):
                booking.final_amount = request.data['final_amount']
        booking.save()
        ActivityLog.log(request.user, 'status_change', 'bookings',
            f"Booking {booking.booking_number} status changed: {old_status} → {new_status}",
            request=request, object_id=booking.pk)
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

    @action(detail=True, methods=['post'])
    def cancel_booking(self, request, pk=None):
        """Customer or manager cancels a booking."""
        booking = self.get_object()
        user = request.user
        if user.role == CUSTOMER:
            if not hasattr(user, 'customer_profile') or booking.customer != user.customer_profile:
                return Response({'error': 'Not your booking'}, status=status.HTTP_403_FORBIDDEN)
            if booking.status not in ('pending', 'assigned'):
                return Response(
                    {'error': 'Only pending or assigned bookings can be cancelled'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'error': 'Cancellation reason is required'}, status=status.HTTP_400_BAD_REQUEST)
        old_status = booking.status
        booking.status = 'cancelled'
        booking.cancellation_reason = reason
        booking.save()
        ActivityLog.log(request.user, 'status_change', 'bookings',
            f"Booking {booking.booking_number} cancelled (was {old_status}): {reason}",
            request=request, object_id=booking.pk)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """List or send chat messages for a booking."""
        booking = self.get_object()
        user = request.user

        if getattr(user, 'role', None) == CUSTOMER:
            if not hasattr(user, 'customer_profile') or booking.customer != user.customer_profile:
                return Response({'error': 'Not your booking'}, status=status.HTTP_403_FORBIDDEN)
        elif getattr(user, 'role', None) == TECHNICIAN:
            if not hasattr(user, 'technician_profile') or booking.technician != user.technician_profile:
                return Response({'error': 'Not assigned to this booking'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            msgs = BookingMessage.objects.filter(booking=booking)
            msgs.exclude(sender=user).filter(is_read=False).update(is_read=True)
            return Response(BookingMessageSerializer(msgs, many=True, context={'request': request}).data)

        # POST — send message (text and/or attachment)
        text = request.data.get('message', '').strip()
        attachment = request.FILES.get('attachment')
        if not text and not attachment:
            return Response({'error': 'Message or attachment required'}, status=status.HTTP_400_BAD_REQUEST)

        msg = BookingMessage.objects.create(
            booking=booking,
            sender=user,
            message=text,
            attachment=attachment,
            attachment_name=attachment.name if attachment else '',
        )

        # Broadcast via WebSocket channel group so open clients see it instantly
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            attachment_url = request.build_absolute_uri(msg.attachment.url) if msg.attachment else None
            async_to_sync(channel_layer.group_send)(
                f'booking_chat_{booking.id}',
                {
                    'type': 'chat_message',
                    'id': str(msg.id),
                    'sender': str(msg.sender_id),
                    'sender_name': user.get_full_name(),
                    'sender_role': user.role,
                    'message': msg.message,
                    'attachment': attachment_url,
                    'attachment_name': msg.attachment_name,
                    'is_read': msg.is_read,
                    'created_at': msg.created_at.isoformat(),
                }
            )
        except Exception:
            pass  # WS broadcast is best-effort; REST response is the source of truth

        serializer = BookingMessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit_review(self, request, pk=None):
        """Customer submits a rating and review for a completed booking."""
        booking = self.get_object()
        user = request.user
        if user.role == CUSTOMER:
            if not hasattr(user, 'customer_profile') or booking.customer != user.customer_profile:
                return Response({'error': 'Not your booking'}, status=status.HTTP_403_FORBIDDEN)
        if booking.status != 'completed':
            return Response({'error': 'Reviews can only be submitted for completed bookings'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            rating = int(request.data.get('rating', 0))
        except (ValueError, TypeError):
            rating = 0
        if not (1 <= rating <= 5):
            return Response({'error': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        booking.rating = rating
        booking.review = request.data.get('review', '').strip()
        booking.save()
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)
