from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('billing', '0003_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='shops.shop'),
        ),
        migrations.AddField(
            model_name='payment',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['shop', 'invoice_date'], name='billing_inv_shop_id_f31bee_idx'),
        ),
    ]
