from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('bookings', '0007_bookingmessage_attachment'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['shop', 'status'], name='bookings_bo_shop_id_f97578_idx'),
        ),
    ]
