from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_shop_and_sop_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='managerpermission',
            name='action',
            field=models.CharField(
                choices=[
                    ('view', 'View'),
                    ('create', 'Create'),
                    ('update', 'Update'),
                    ('delete', 'Delete'),
                    ('export_csv', 'Export CSV'),
                    ('export', 'Export'),
                    ('approve', 'Approve'),
                    ('assign', 'Assign'),
                    ('manage_staff', 'Manage Staff'),
                    ('manage_inventory', 'Manage Inventory'),
                    ('manage_services', 'Manage Services'),
                    ('manage_bookings', 'Manage Bookings'),
                ],
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='managerpermission',
            name='manager',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='manager_permissions',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterModelOptions(
            name='managerpermission',
            options={
                'ordering': ['manager', 'module', 'action'],
                'verbose_name': 'Staff Permission',
                'verbose_name_plural': 'Staff Permissions',
            },
        ),
    ]
