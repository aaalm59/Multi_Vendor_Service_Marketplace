from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from apps.staff.models import Staff, Attendance
from apps.users.serializers import UserDetailSerializer
from apps.users.permissions import HasRolePermission, MANAGER_ROLES

class StaffSerializer(ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['user'] = UserDetailSerializer(instance.user).data
        return data

    class Meta:
        model = Staff
        fields = '__all__'

class AttendanceSerializer(ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'

class StaffViewSet(viewsets.ModelViewSet):
    """Staff management API"""
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [HasRolePermission]
    allowed_roles = MANAGER_ROLES
    filterset_fields = ['designation', 'department', 'city']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'department', 'city']
    ordering_fields = ['joining_date', 'salary', 'created_at']
    
    @action(detail=True, methods=['get'])
    def attendance_records(self, request, pk=None):
        """Get staff attendance records"""
        staff = self.get_object()
        attendance = Attendance.objects.filter(staff=staff)
        serializer = AttendanceSerializer(attendance, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_attendance(self, request, pk=None):
        """Mark staff attendance"""
        staff = self.get_object()
        from datetime import date
        today = date.today()
        
        attendance, created = Attendance.objects.get_or_create(
            staff=staff,
            date=today,
            defaults={'status': request.data.get('status', 'present')}
        )
        
        serializer = AttendanceSerializer(attendance)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

class AttendanceViewSet(viewsets.ModelViewSet):
    """Attendance management API"""
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [HasRolePermission]
    allowed_roles = MANAGER_ROLES
    filterset_fields = ['staff', 'date', 'status']
