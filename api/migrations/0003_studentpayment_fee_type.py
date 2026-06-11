# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_classfee_feetype_financeledger_paymentplan_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentpayment',
            name='fee_type',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='student_payments', to='api.FeeType'),
        ),
    ]
