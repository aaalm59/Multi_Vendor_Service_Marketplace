from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='services', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='service',
            index=models.Index(fields=['shop'], name='services_se_shop_id_68de9e_idx'),
        ),
    ]
