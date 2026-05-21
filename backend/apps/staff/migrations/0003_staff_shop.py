from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('staff', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='staff',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='staff', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='staff',
            index=models.Index(fields=['shop'], name='staff_staff_shop_id_3bc416_idx'),
        ),
    ]
