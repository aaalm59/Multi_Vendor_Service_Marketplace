from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('customers', '0003_alter_customer_preferred_contact'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='customers', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='customer',
            index=models.Index(fields=['shop'], name='customers_c_shop_id_12118d_idx'),
        ),
    ]
