# Generated migration for multi-month support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='shoprentalpayment',
            name='period_months',
            field=models.JSONField(blank=True, default=list, help_text='List of month numbers (e.g., ["01", "02", "03"] for Shamsi or Qamari months)'),
        ),
        migrations.AddField(
            model_name='shoprentalpayment',
            name='calendar_type',
            field=models.CharField(choices=[('shamsi', 'Shamsi'), ('qamari', 'Qamari')], default='shamsi', help_text='Calendar type used for period_months and period_year', max_length=10),
        ),
        migrations.AddIndex(
            model_name='shoprentalpayment',
            index=models.Index(fields=['period_year'], name='api_shoprent_period_y_idx'),
        ),
    ]
