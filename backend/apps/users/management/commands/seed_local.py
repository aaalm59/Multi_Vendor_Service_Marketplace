from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.customers.models import Customer
from apps.expenses.models import Expense, ExpenseCategory
from apps.inventory.models import Inventory, Product, ProductCategory
from apps.services.models import Service
from apps.staff.models import Staff
from apps.suppliers.models import Supplier
from apps.technicians.models import Technician
from apps.reports.models import DailyMetrics


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

        manager_user, created = User.objects.get_or_create(
            email='manager@example.com',
            defaults={
                'username': 'manager@example.com',
                'first_name': 'Shop',
                'last_name': 'Manager',
                'phone': '9000000002',
                'role': 'manager',
                'is_staff': True,
            },
        )
        if created:
            manager_user.set_password('manager123')
            manager_user.save()

        technician_user, created = User.objects.get_or_create(
            email='technician@example.com',
            defaults={
                'username': 'technician@example.com',
                'first_name': 'Ravi',
                'last_name': 'Technician',
                'phone': '9000000003',
                'role': 'technician',
            },
        )
        if created:
            technician_user.set_password('tech123')
            technician_user.save()

        Staff.objects.get_or_create(
            user=manager_user,
            defaults={
                'designation': 'manager',
                'department': 'Operations',
                'salary': Decimal('35000.00'),
                'joining_date': timezone.localdate(),
                'emergency_contact': '9000000099',
                'address': 'Local Market Office',
                'city': 'Patna',
                'state': 'Bihar',
                'postal_code': '800001',
            },
        )

        Technician.objects.get_or_create(
            user=technician_user,
            defaults={
                'specialization': 'Home wiring, fan repair, inverter service',
                'experience_years': 6,
                'hourly_rate': Decimal('250.00'),
                'availability_status': 'available',
                'completed_bookings': 42,
                'average_rating': 4.6,
                'total_earnings': Decimal('58000.00'),
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

        suppliers = [
            ('Bright Electricals', 'Amit Kumar', 'bright@example.com', '9111111111', Decimal('45000.00'), Decimal('30000.00')),
            ('Power House Traders', 'Neha Singh', 'powerhouse@example.com', '9222222222', Decimal('32000.00'), Decimal('32000.00')),
        ]
        for name, contact, email, phone, purchases, paid in suppliers:
            Supplier.objects.get_or_create(
                email=email,
                defaults={
                    'name': name,
                    'contact_person': contact,
                    'phone': phone,
                    'address': 'Wholesale Market',
                    'city': 'Patna',
                    'state': 'Bihar',
                    'postal_code': '800001',
                    'gst_number': 'LOCALGST1234',
                    'payment_terms': '15 days',
                    'total_purchases': purchases,
                    'total_paid': paid,
                },
            )

        expense_categories = {
            name: ExpenseCategory.objects.get_or_create(name=name)[0]
            for name in ['Shop Rent', 'Electricity Bills', 'Salary', 'Transport', 'Misc Expenses']
        }
        Expense.objects.get_or_create(
            description='Monthly shop rent',
            expense_date=timezone.localdate(),
            defaults={
                'category': expense_categories['Shop Rent'],
                'amount': Decimal('18000.00'),
                'payment_method': 'bank_transfer',
                'is_approved': True,
                'approved_by': 'Local Admin',
            },
        )

        today = timezone.localdate()
        for offset in range(7):
            day = today - timedelta(days=offset)
            revenue = Decimal('4500.00') + Decimal(offset * 350)
            expense = Decimal('1200.00') + Decimal(offset * 120)
            DailyMetrics.objects.update_or_create(
                date=day,
                defaults={
                    'total_revenue': revenue,
                    'total_expenses': expense,
                    'total_profit': revenue - expense,
                    'total_bookings': 4 + offset,
                    'completed_bookings': 2 + offset,
                    'pending_bookings': 2,
                    'total_products_sold': 8 + offset,
                    'new_customers': 1 if offset % 2 == 0 else 0,
                },
            )

        self.stdout.write(self.style.SUCCESS(f'Local seed completed at {timezone.now():%Y-%m-%d %H:%M:%S}.'))
