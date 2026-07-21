from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_remove_feetype_category'),
    ]

    operations = [
        migrations.AlterField(
            model_name='employee',
            name='position',
            field=models.CharField(
                blank=True,
                choices=[
                    ('teacher', 'Teacher'),
                    ('finance', 'Finance'),
                    ('office_employee', 'Office Employee'),
                    ('cleaner', 'Cleaner'),
                    ('security', 'Security'),
                    ('other', 'Other'),
                ],
                max_length=50,
                null=True,
            ),
        ),
    ]
