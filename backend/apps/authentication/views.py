import math
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str
from apps.authentication.serializers import (
    CustomTokenObtainPairSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
)
from apps.users.serializers import UserRegisterSerializer, UserDetailSerializer, UserUpdateSerializer
from apps.users.models import ActivityLog

User = get_user_model()

FACE_MATCH_THRESHOLD = 0.6

def _euclidean_distance(v1, v2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2)))

class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token obtain pair view"""
    serializer_class = CustomTokenObtainPairSerializer

class AuthViewSet(viewsets.ViewSet):
    """Authentication API endpoints"""
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Register new user"""
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserDetailSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        """Login user"""
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            ActivityLog.log(user, 'login', 'auth',
                f"{user.get_full_name()} logged in", request=request)
            return Response({
                'user': UserDetailSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Logout user"""
        try:
            ActivityLog.log(request.user, 'logout', 'auth',
                f"{request.user.get_full_name()} logged out", request=request)
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """Change password"""
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Old password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def password_reset(self, request):
        """Issue a local-development password reset token in the API response."""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data['email'], is_active=True).first()
        if not user:
            return Response({'message': 'If the account exists, a reset token was generated.'})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return Response({
            'message': 'Local reset token generated.',
            'uid': uid,
            'token': token,
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def password_reset_confirm(self, request):
        """Confirm a local-development password reset token."""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            uid = force_str(urlsafe_base64_decode(request.data.get('uid')))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data['token']):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])
        return Response({'message': 'Password reset successfully.'})
    
    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get current user or update own profile fields."""
        if request.method == 'PATCH':
            serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(UserDetailSerializer(request.user).data, status=status.HTTP_200_OK)
        return Response(UserDetailSerializer(request.user).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def face_register(self, request):
        """Store face descriptor for the authenticated user."""
        descriptor = request.data.get('descriptor')
        if not descriptor or not isinstance(descriptor, list) or len(descriptor) != 128:
            return Response({'error': 'Valid 128-element face descriptor required.'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.face_encoding = descriptor
        user.face_registered = True
        user.save(update_fields=['face_encoding', 'face_registered'])
        ActivityLog.log(user, 'update', 'auth', 'Face registered', request=request)
        return Response({'message': 'Face registered successfully.'})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def face_login(self, request):
        """Match face descriptor against all registered users and return JWT if matched."""
        descriptor = request.data.get('descriptor')
        if not descriptor or not isinstance(descriptor, list) or len(descriptor) != 128:
            return Response({'error': 'Valid 128-element face descriptor required.'}, status=status.HTTP_400_BAD_REQUEST)

        candidates = User.objects.filter(face_registered=True, is_active=True).exclude(face_encoding__isnull=True)
        best_user = None
        best_dist = float('inf')
        for candidate in candidates:
            try:
                dist = _euclidean_distance(descriptor, candidate.face_encoding)
                if dist < best_dist:
                    best_dist = dist
                    best_user = candidate
            except Exception:
                continue

        if best_user is None or best_dist > FACE_MATCH_THRESHOLD:
            return Response({'error': 'Face not recognised. Please try again or use password login.'}, status=status.HTTP_401_UNAUTHORIZED)

        best_user.last_face_login = timezone.now()
        best_user.save(update_fields=['last_face_login'])
        refresh = RefreshToken.for_user(best_user)
        ActivityLog.log(best_user, 'login', 'auth', f'{best_user.get_full_name()} logged in via face recognition', request=request)
        return Response({
            'user': UserDetailSerializer(best_user).data,
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
            'match_distance': round(best_dist, 4),
        })
