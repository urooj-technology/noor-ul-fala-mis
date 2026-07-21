from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_student_fee_type"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="feetype",
            name="category",
        ),
    ]
