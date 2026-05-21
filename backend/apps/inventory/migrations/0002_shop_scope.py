from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productcategory',
            name='name',
            field=models.CharField(max_length=100),
        ),
        migrations.AddField(
            model_name='productcategory',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='product_categories', to='shops.shop'),
        ),
        migrations.AlterUniqueTogether(
            name='productcategory',
            unique_together={('shop', 'name')},
        ),
        migrations.AlterField(
            model_name='product',
            name='SKU',
            field=models.CharField(max_length=50),
        ),
        migrations.AlterField(
            model_name='product',
            name='barcode',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='products', to='shops.shop'),
        ),
        migrations.AddField(
            model_name='inventory',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='inventory_records', to='shops.shop'),
        ),
        migrations.AddField(
            model_name='stockmovement',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='stock_movements', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='product',
            index=models.Index(fields=['shop', 'SKU'], name='inventory_p_shop_id_b1c08e_idx'),
        ),
        migrations.AddIndex(
            model_name='inventory',
            index=models.Index(fields=['shop'], name='inventory_i_shop_id_c69ad5_idx'),
        ),
        migrations.AddIndex(
            model_name='stockmovement',
            index=models.Index(fields=['shop', 'created_at'], name='inventory_s_shop_id_b1f6ab_idx'),
        ),
    ]
