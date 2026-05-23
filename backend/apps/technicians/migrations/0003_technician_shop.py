from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('technicians', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='technician',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='technicians', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='technician',
            index=models.Index(fields=['shop', 'availability_status'], name='technicians_shop_id_508f14_idx'),
        ),
    ]
