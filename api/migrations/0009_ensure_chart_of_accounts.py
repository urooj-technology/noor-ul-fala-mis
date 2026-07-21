from django.db import migrations


def ensure_accounts(apps, schema_editor):
    """Seed standard AFN/USD accounts if they do not already exist."""
    from api.services.chart_of_accounts import ensure_chart_of_accounts

    ensure_chart_of_accounts()


def noop_reverse(apps, schema_editor):
    # Do not delete accounts on reverse — they may already have journal entries.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_employee_position_choices'),
    ]

    operations = [
        migrations.RunPython(ensure_accounts, noop_reverse),
    ]
