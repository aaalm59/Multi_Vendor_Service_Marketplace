from rest_framework import serializers
from apps.customers.models import Customer
from apps.users.models import User
from apps.users.serializers import UserSerializer

class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Customer
        fields = ['id', 'user', 'gst_number', 'shop_name', 'address', 'city', 'state', 'postal_code', 'total_spent', 'average_rating', 'created_at']

class CustomerDetailSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'

class CustomerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['gst_number', 'shop_name', 'address', 'city', 'state', 'postal_code', 'preferred_contact']

class CustomerCreateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email = serializers.EmailField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Customer
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'gst_number',
            'shop_name',
            'address',
            'city',
            'state',
            'postal_code',
            'preferred_contact',
        ]

    def create(self, validated_data):
        user_data = {
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name', ''),
            'email': validated_data.pop('email'),
            'phone': validated_data.pop('phone', ''),
            'role': 'customer',
            'username': None,
        }
        user_data['username'] = user_data['email']
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults=user_data,
        )
        if hasattr(user, 'customer_profile'):
            raise serializers.ValidationError({'email': 'Customer profile already exists for this email.'})
        if created:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        return Customer.objects.create(user=user, **validated_data)
