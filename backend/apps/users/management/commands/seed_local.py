from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.customers.models import Customer
from apps.inventory.models import Inventory, Product, ProductCategory
from apps.services.models import Service


class Command(BaseCommand):
    help = 'Seed local development data for the Electric Service ERP.'

    def handle(self, *args, **options):
        User = get_user_model()

        admin, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'username': 'admin@example.com',
                'first_name': 'Local',
                'last_name': 'Admin',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
            },
        )
        if created:
            admin.set_password('admin123')
            admin.save()

        customer_user, _ = User.objects.get_or_create(
            email='customer@example.com',
            defaults={
                'username': 'customer@example.com',
                'first_name': 'Demo',
                'last_name': 'Customer',
                'phone': '9000000001',
                'role': 'customer',
            },
        )
        customer_user.set_password('customer123')
        customer_user.save()

        Customer.objects.get_or_create(
            user=customer_user,
            defaults={
                'address': 'Main Road, Local Market',
                'city': 'Patna',
                'state': 'Bihar',
                'postal_code': '800001',
                'preferred_contact': 'phone',
            },
        )

        categories = ['Wire', 'Switch', 'Fan', 'LED', 'CCTV', 'Battery', 'Inverter', 'Motor Pump']
        category_map = {
            name: ProductCategory.objects.get_or_create(name=name)[0]
            for name in categories
        }

        products = [
            ('LED-9W', '9W LED Bulb', 'LED', Decimal('120.00'), Decimal('75.00'), 35),
            ('WIRE-90M', 'Copper Wire Roll 90m', 'Wire', Decimal('1450.00'), Decimal('1120.00'), 12),
            ('SW-MOD', 'Modular Switch', 'Switch', Decimal('80.00'), Decimal('45.00'), 80),
            ('FAN-CAP', 'Fan Capacitor', 'Fan', Decimal('150.00'), Decimal('90.00'), 18),
        ]
        for sku, name, category, price, cost_price, qty in products:
            product, _ = Product.objects.get_or_create(
                SKU=sku,
                defaults={
                    'name': name,
                    'category': category_map[category],
                    'price': price,
                    'cost_price': cost_price,
                    'barcode': sku,
                },
            )
            Inventory.objects.get_or_create(
                product=product,
                defaults={'quantity_on_hand': qty, 'reorder_level': 10, 'reorder_quantity': 30},
            )

        services = [
            ('Home Wiring Repair', 'Fault finding and wiring repair for homes.', Decimal('499.00'), 90),
            ('Fan Installation', 'Ceiling fan installation with wiring check.', Decimal('299.00'), 45),
            ('Inverter Service', 'Battery and inverter health check.', Decimal('599.00'), 75),
        ]
        for name, description, price, duration in services:
            Service.objects.get_or_create(
                name=name,
                defaults={
                    'description': description,
                    'base_price': price,
                    'estimated_duration': duration,
                },
            )

        self.stdout.write(self.style.SUCCESS(f'Local seed completed at {timezone.now():%Y-%m-%d %H:%M:%S}.'))
