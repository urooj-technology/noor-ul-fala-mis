"""
Migration to populate class_level in existing StudentFeeAssignment records
and handle the transition to level-based finance.

This ensures existing assignments are properly linked to class levels.
"""
from django.db import migrations


def populate_class_level_in_assignments(apps, schema_editor):
    """
    Populate class_level for existing StudentFeeAssignment records.
    Uses the student's current class_level as the default.
    """
    StudentFeeAssignment = apps.get_model('api', 'StudentFeeAssignment')
    Student = apps.get_model('api', 'Student')
    
    # Get all assignments without a class_level
    assignments = StudentFeeAssignment.objects.filter(class_level__isnull=True)
    
    updated_count = 0
    for assignment in assignments.select_related('student'):
        if assignment.student and assignment.student.class_level:
            assignment.class_level = assignment.student.class_level
            assignment.save(update_fields=['class_level'])
            updated_count += 1
    
    print(f"Updated {updated_count} assignments with class_level")


def reverse_populate(apps, schema_editor):
    """
    Reverse migration - set class_level to null (not recommended)
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_level_based_finance'),
    ]

    operations = [
        migrations.RunPython(populate_class_level_in_assignments, reverse_populate),
    ]
