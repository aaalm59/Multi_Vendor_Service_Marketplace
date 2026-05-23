from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer with additional user info"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_id'] = str(user.id)
        token['email'] = user.email
        token['role'] = user.role
        token['shop_id'] = str(user.shop_id) if user.shop_id else ''
        token['full_name'] = user.get_full_name()
        return token

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        try:
            user = User.objects.select_related('shop').get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            # Give a specific message if the account was blocked due to shop suspension
            if user.shop_id and hasattr(user, 'shop') and user.shop:
                shop_status = user.shop.status
                if shop_status == 'suspended':
                    raise serializers.ValidationError(
                        "Your shop has been suspended. Please contact the platform administrator."
                    )
                if shop_status == 'rejected':
                    raise serializers.ValidationError(
                        "Your shop registration was rejected. Please contact the platform administrator."
                    )
            raise serializers.ValidationError("Your account has been disabled. Please contact support.")

        # Extra guard: block login if the user's shop is suspended/rejected even if is_active wasn't updated
        if user.shop_id and hasattr(user, 'shop') and user.shop:
            shop_status = user.shop.status
            if shop_status == 'suspended':
                raise serializers.ValidationError(
                    "Your shop has been suspended. Please contact the platform administrator."
                )
            if shop_status == 'rejected':
                raise serializers.ValidationError(
                    "Your shop registration was rejected. Please contact the platform administrator."
                )

        data['user'] = user
        return data

class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return data

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Passwords don't match."})
        return data
