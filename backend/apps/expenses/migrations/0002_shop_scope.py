from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('expenses', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='expensecategory',
            name='name',
            field=models.CharField(max_length=100),
        ),
        migrations.AddField(
            model_name='expensecategory',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='expense_categories', to='shops.shop'),
        ),
        migrations.AlterUniqueTogether(
            name='expensecategory',
            unique_together={('shop', 'name')},
        ),
        migrations.AddField(
            model_name='expense',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='expenses', to='shops.shop'),
        ),
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['shop', 'expense_date'], name='expenses_ex_shop_id_98fb51_idx'),
        ),
    ]
