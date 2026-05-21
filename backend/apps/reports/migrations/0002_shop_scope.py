from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('shops', '0001_initial'),
        ('reports', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='shops.shop'),
        ),
        migrations.AlterField(
            model_name='dailymetrics',
            name='date',
            field=models.DateField(),
        ),
        migrations.AddField(
            model_name='dailymetrics',
            name='shop',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='daily_metrics', to='shops.shop'),
        ),
        migrations.AlterUniqueTogether(
            name='dailymetrics',
            unique_together={('shop', 'date')},
        ),
    ]
