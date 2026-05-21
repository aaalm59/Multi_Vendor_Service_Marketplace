from rest_framework import serializers
from apps.users.models import User, ManagerPermission, ActivityLog
from django.contrib.auth.password_validation import validate_password


class ManagerPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagerPermission
        fields = ['id', 'module', 'action']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'shop', 'avatar', 'bio', 'is_active']


class UserDetailSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    shop_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'shop', 'shop_name', 'avatar', 'bio', 'is_verified', 'created_at', 'updated_at', 'permissions']

    def get_permissions(self, obj):
        if obj.role == 'manager':
            return ManagerPermissionSerializer(obj.manager_permissions.all(), many=True).data
        return []

    def get_shop_name(self, obj):
        return obj.shop.name if obj.shop else ''

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'role', 'shop', 'password', 'password_confirm']
        extra_kwargs = {'role': {'required': False}}
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        validated_data['username'] = validated_data['email']
        user = User.objects.create_user(**validated_data)
        # Auto-create Customer profile so booking and customer APIs work immediately
        if user.role == 'customer':
            from apps.customers.models import Customer
            Customer.objects.get_or_create(
                user=user,
                defaults={'address': '', 'city': '', 'state': '', 'postal_code': ''},
            )
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'bio', 'avatar', 'shop']

class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'bio', 'role', 'shop', 'is_active']

class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'role', 'shop', 'password']
        extra_kwargs = {'role': {'required': True}}

    def create(self, validated_data):
        validated_data['username'] = validated_data['email']
        return User.objects.create_user(**validated_data)


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_name', 'user_role', 'action', 'module',
                  'description', 'object_id', 'ip_address', 'timestamp', 'extra']

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'

    def get_user_role(self, obj):
        return obj.user.role if obj.user else None
