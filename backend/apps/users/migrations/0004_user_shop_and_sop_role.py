from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('users', '0003_activitylog'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='shop',
            field=models.ForeignKey(blank=True, help_text='Tenant shop for SOP users and staff. Super admins/customers may be global.', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='users', to='shops.shop'),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(choices=[('admin', 'Admin'), ('sop_user', 'SOP User / Shop Manager'), ('manager', 'Manager'), ('technician', 'Technician'), ('sales_staff', 'Sales Staff'), ('inventory_staff', 'Inventory Staff'), ('customer', 'Customer')], default='customer', max_length=20),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['shop', 'role'], name='users_user_shop_id_97deaa_idx'),
        ),
    ]
