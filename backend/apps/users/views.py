from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from apps.users.serializers import UserSerializer, UserDetailSerializer, UserUpdateSerializer
from apps.users.permissions import IsAdminOrManager

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """User management API"""
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [IsAdminOrManager]
    filterset_fields = ['role', 'is_active']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'email', 'role']
    
    def get_serializer_class(self):
        if self.action == 'update' or self.action == 'partial_update':
            return UserUpdateSerializer
        return UserDetailSerializer
    
    @action(detail=False, methods=['get'])
    def by_role(self, request):
        """Get users filtered by role"""
        role = request.query_params.get('role')
        if not role:
            return Response({'error': 'Role parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        users = User.objects.filter(role=role)
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate user"""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'message': 'User activated'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate user"""
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'message': 'User deactivated'}, status=status.HTTP_200_OK)
