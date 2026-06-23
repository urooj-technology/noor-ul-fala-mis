from django.core.management.base import BaseCommand
from api.models.data.permissions import Permission
from account.models import User


class Command(BaseCommand):
    help = 'Create default permissions for the ERP system'
    
    PERMISSIONS = [
        # Dashboard
        {'name': 'View Dashboard', 'codename': 'view_dashboard', 'module': 'dashboard'},

        # User Management
        {'name': 'View Users', 'codename': 'view_users', 'module': 'users'},
        {'name': 'Create Users', 'codename': 'create_users', 'module': 'users'},
        {'name': 'Edit Users', 'codename': 'edit_users', 'module': 'users'},
        {'name': 'Delete Users', 'codename': 'delete_users', 'module': 'users'},
        
        # Student Management
        {'name': 'View Students', 'codename': 'view_students', 'module': 'students'},
        {'name': 'Create Students', 'codename': 'create_students', 'module': 'students'},
        {'name': 'Edit Students', 'codename': 'edit_students', 'module': 'students'},
        {'name': 'Delete Students', 'codename': 'delete_students', 'module': 'students'},
        {'name': 'View Student Payments', 'codename': 'view_student_payments', 'module': 'students'},
        {'name': 'Create Student Payments', 'codename': 'create_student_payments', 'module': 'students'},
        {'name': 'Edit Student Payments', 'codename': 'edit_student_payments', 'module': 'students'},
        {'name': 'Delete Student Payments', 'codename': 'delete_student_payments', 'module': 'students'},
        
        # HR Management
        {'name': 'View Employees', 'codename': 'view_employees', 'module': 'hr'},
        {'name': 'Create Employees', 'codename': 'create_employees', 'module': 'hr'},
        {'name': 'Edit Employees', 'codename': 'edit_employees', 'module': 'hr'},
        {'name': 'Delete Employees', 'codename': 'delete_employees', 'module': 'hr'},
        
        # Payroll
        {'name': 'View Payroll', 'codename': 'view_payroll', 'module': 'payroll'},
        {'name': 'Create Payroll', 'codename': 'create_payroll', 'module': 'payroll'},
        {'name': 'Edit Payroll', 'codename': 'edit_payroll', 'module': 'payroll'},
        {'name': 'Delete Payroll', 'codename': 'delete_payroll', 'module': 'payroll'},
        {'name': 'View Advances', 'codename': 'view_advances', 'module': 'payroll'},
        {'name': 'Create Advances', 'codename': 'create_advances', 'module': 'payroll'},
        {'name': 'Edit Advances', 'codename': 'edit_advances', 'module': 'payroll'},
        {'name': 'Delete Advances', 'codename': 'delete_advances', 'module': 'payroll'},
        
        # Expenses
        {'name': 'View Expenses', 'codename': 'view_expenses', 'module': 'expenses'},
        {'name': 'Create Expenses', 'codename': 'create_expenses', 'module': 'expenses'},
        {'name': 'Edit Expenses', 'codename': 'edit_expenses', 'module': 'expenses'},
        {'name': 'Delete Expenses', 'codename': 'delete_expenses', 'module': 'expenses'},
        {'name': 'Approve Expenses', 'codename': 'approve_expenses', 'module': 'expenses'},

        # Equipment / Warehouse (standalone inventory — not accounting)
        {'name': 'View Equipment', 'codename': 'view_equipment', 'module': 'equipment'},
        {'name': 'Create Equipment', 'codename': 'create_equipment', 'module': 'equipment'},
        {'name': 'Edit Equipment', 'codename': 'edit_equipment', 'module': 'equipment'},
        {'name': 'Delete Equipment', 'codename': 'delete_equipment', 'module': 'equipment'},
        {'name': 'Transfer Equipment Stock', 'codename': 'transfer_equipment_stock', 'module': 'equipment'},
        
        # Accounting
        {'name': 'View Accounting', 'codename': 'view_accounting', 'module': 'accounting'},
        {'name': 'Create Journal Entries', 'codename': 'create_journal_entries', 'module': 'accounting'},
        {'name': 'Edit Journal Entries', 'codename': 'edit_journal_entries', 'module': 'accounting'},
        {'name': 'Delete Journal Entries', 'codename': 'delete_journal_entries', 'module': 'accounting'},
        {'name': 'View Financial Reports', 'codename': 'view_financial_reports', 'module': 'accounting'},
        {'name': 'Export Reports', 'codename': 'export_reports', 'module': 'accounting'},
        
        # Shop Rental
        {'name': 'View Shop Rentals', 'codename': 'view_shop_rentals', 'module': 'rental'},
        {'name': 'Create Shop Rentals', 'codename': 'create_shop_rentals', 'module': 'rental'},
        {'name': 'Edit Shop Rentals', 'codename': 'edit_shop_rentals', 'module': 'rental'},
        {'name': 'Delete Shop Rentals', 'codename': 'delete_shop_rentals', 'module': 'rental'},
        
        # Other Income
        {'name': 'View Other Income', 'codename': 'view_other_income', 'module': 'income'},
        {'name': 'Create Other Income', 'codename': 'create_other_income', 'module': 'income'},
        {'name': 'Edit Other Income', 'codename': 'edit_other_income', 'module': 'income'},
        {'name': 'Delete Other Income', 'codename': 'delete_other_income', 'module': 'income'},
        
        # Reports
        {'name': 'View Reports', 'codename': 'view_reports', 'module': 'reports'},
        {'name': 'Export Reports', 'codename': 'export_reports', 'module': 'reports'},
        
        # Activity Logs
        {'name': 'View Activity Logs', 'codename': 'view_activity_logs', 'module': 'system'},
        
        # Settings
        {'name': 'Manage Settings', 'codename': 'manage_settings', 'module': 'system'},
    ]
    
    def handle(self, *args, **options):
        self.stdout.write('Creating default permissions...')
        
        created_count = 0
        for perm_data in self.PERMISSIONS:
            permission, created = Permission.objects.get_or_create(
                codename=perm_data['codename'],
                defaults=perm_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'Created permission: {permission.name}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} permissions')
        )
