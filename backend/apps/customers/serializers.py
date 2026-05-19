from rest_framework import serializers
from apps.customers.models import Customer
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
