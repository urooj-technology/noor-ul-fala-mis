from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from decimal import Decimal
from datetime import timedelta, date
import random

from account.models import User
from api.models.data.employee import Employee
from api.models.data.advance import Advance
from api.models.data.expenses import ExpenseCategory, Expense
from api.models.data.payroll import Payroll
from api.models.data.activity_log import ActivityLog
from api.models.data.permissions import Permission, UserPermission
from api.models.data.student import Student, CLASS_LEVEL_CHOICES
from api.models.data.student_finance import FeeType, StudentFeeAssignment, StudentPayment, FinanceLedger
from api.models.data.shop_rental import Shop, Tenant, ShopRental
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.models.data.accounting import AccountCategory, Account, Transaction, JournalEntry, FiscalYear
from api.models.data.other_income import IncomeCategory, OtherIncome

fake = Faker()


class Command(BaseCommand):
    help = 'Insert sample data for all models'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting data insertion...'))
        
        # Initialize chart of accounts first (needed for payroll/expense journal entries)
        self.stdout.write('Initializing chart of accounts...')
        from django.core.management import call_command
        try:
            call_command('init_chart_of_accounts')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Chart of accounts may already exist: {e}'))
        
        self.clear_existing_data()
        
        # Core models
        users = self.create_users(50)
        permissions = self.create_permissions(20)
        user_permissions = self.create_user_permissions(100, users, permissions)
        
        # Employee & HR
        employees = self.create_employees(100)
        advances = self.create_advances(50, employees)
        payrolls = self.create_payrolls(100, employees)
        
        # Expenses
        expense_categories = self.create_expense_categories(10)
        expenses = self.create_expenses(100, expense_categories, users)
        
        # Student & Education
        class_levels = self.get_class_levels()
        students = self.create_students(200, class_levels)
        fee_types = self.create_fee_types()
        fee_assignments = self.create_fee_assignments(students, fee_types, class_levels)
        student_payments = self.create_student_payments(fee_assignments)
        
        # Shop Rental
        shops = self.create_shops(20)
        tenants = self.create_tenants(15)
        rentals = self.create_rentals(shops, tenants)
        rental_payments = self.create_rental_payments(rentals)
        
        # Accounting - Get existing from init_chart_of_accounts
        account_categories = AccountCategory.objects.all()
        accounts = Account.objects.all()
        fiscal_years = FiscalYear.objects.all()
        transactions = self.create_transactions(accounts)
        
        # Other Income
        income_categories = self.create_income_categories()
        other_incomes = self.create_other_incomes(income_categories)
        
        # Activity Logs
        activity_logs = self.create_activity_logs(200, users)
        
        self.stdout.write(self.style.SUCCESS(f'''
Data insertion completed!
- Users: {len(users)}
- Permissions: {len(permissions)}
- User Permissions: {len(user_permissions)}
- Employees: {len(employees)}
- Advances: {len(advances)}
- Payrolls: {len(payrolls)}
- Expense Categories: {len(expense_categories)}
- Expenses: {len(expenses)}
- Class Levels: {len(class_levels)}
- Students: {len(students)}
- Fee Types: {len(fee_types)}
- Fee Assignments: {len(fee_assignments)}
- Student Payments: {len(student_payments)}
- Shops: {len(shops)}
- Tenants: {len(tenants)}
- Rentals: {len(rentals)}
- Rental Payments: {len(rental_payments)}
- Account Categories: {len(account_categories)}
- Accounts: {len(accounts)}
- Fiscal Years: {len(fiscal_years)}
- Transactions: {len(transactions)}
- Income Categories: {len(income_categories)}
- Other Incomes: {len(other_incomes)}
- Activity Logs: {len(activity_logs)}
'''))

    def create_users(self, count):
        users = []
        roles = ['admin', 'staff', 'employee', 'customer']
        
        for i in range(count):
            email = f"user{i+1}@example.com"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f"user{i+1}",
                    'first_name': fake.first_name(),
                    'last_name': fake.last_name(),
                    'role': random.choice(roles),
                    'is_active': random.choice([True, True, True, False]),
                    'address': fake.address(),
                    'phone': fake.phone_number()
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                users.append(user)
        
        self.stdout.write(f"Created {len(users)} users")
        return users

    def create_employees(self, count):
        employees = []
        positions = ['Manager', 'Supervisor', 'Engineer', 'Analyst', 'Developer', 'Designer', 'Teacher', 'Accountant', 'Security', 'Cleaner']
        currencies = ['USD', 'AFN']
        
        for i in range(count):
            employee = Employee.objects.create(
                full_name=fake.name(),
                phone=fake.phone_number(),
                address=fake.address(),
                position=random.choice(positions),
                salary=Decimal(str(random.randint(500, 5000))),
                currency=random.choice(currencies),
                is_active=random.choice([True, True, True, False])
            )
            employees.append(employee)
        
        self.stdout.write(f"Created {len(employees)} employees")
        return employees

    def create_expense_categories(self, count):
        categories = []
        base_names = ['Office Supplies', 'Travel', 'Marketing', 'Utilities', 'Rent', 'Insurance', 'Maintenance', 'Training', 'Equipment', 'Software']
        
        for i in range(count):
            category = ExpenseCategory.objects.create(
                name=f"{random.choice(base_names)} {i+1}",
                description=fake.text(max_nb_chars=100)
            )
            categories.append(category)
        
        self.stdout.write(f"Created {len(categories)} expense categories")
        return categories

    def create_expenses(self, count, categories, users):
        expenses = []
        currencies = ['USD', 'AFN']
        
        for i in range(count):
            expense = Expense.objects.create(
                category=random.choice(categories),
                amount=Decimal(str(random.randint(50, 10000))),
                currency=random.choice(currencies),
                expense_date=fake.date_time_between(start_date='-2y', end_date='now', tzinfo=timezone.get_current_timezone()),
                description=fake.text(max_nb_chars=200),
                user=random.choice(users) if users else None
            )
            expenses.append(expense)
        
        self.stdout.write(f"Created {len(expenses)} expenses")
        return expenses

    def create_advances(self, count, employees):
        advances = []
        months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
        currencies = ['USD', 'AFN']
        
        for i in range(count):
            employee = random.choice(employees)
            advance = Advance.objects.create(
                employee=employee,
                amount=Decimal(str(random.randint(100, 2000))),
                currency=random.choice(currencies),
                reason=fake.text(max_nb_chars=100),
                year=random.choice([2023, 2024, 2025]),
                month=random.choice(months),
                payment_date=fake.date_time_between(start_date='-1y', end_date='now', tzinfo=timezone.get_current_timezone())
            )
            advances.append(advance)
        
        self.stdout.write(f"Created {len(advances)} advances")
        return advances

    def create_payrolls(self, count, employees):
        payrolls = []
        months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
        currencies = ['USD', 'AFN']
        
        for i in range(count):
            employee = random.choice(employees)
            payroll = Payroll.objects.create(
                employee=employee,
                month=random.choice(months),
                year=random.choice([2023, 2024, 2025]),
                salary=Decimal(str(random.randint(500, 5000))),
                currency=random.choice(currencies),
                payment_date=fake.date_time_between(start_date='-1y', end_date='now', tzinfo=timezone.get_current_timezone())
            )
            payrolls.append(payroll)
        
        self.stdout.write(f"Created {len(payrolls)} payrolls")
        return payrolls

    def create_permissions(self, count):
        permissions = []
        modules = ['users', 'employees', 'expenses', 'payroll', 'students', 'rentals', 'reports', 'settings']
        actions = ['view', 'add', 'edit', 'delete', 'export']
        
        for i in range(count):
            module = modules[i % len(modules)]
            action = actions[i % len(actions)]
            codename = f"{action}_{module}_{i}"
            name = f"{action.title()} {module.title()} {i+1}"
            
            permission, created = Permission.objects.get_or_create(
                name=name,
                defaults={
                    'codename': codename,
                    'module': module,
                    'description': fake.text(max_nb_chars=100)
                }
            )
            if created:
                permissions.append(permission)
        
        self.stdout.write(f"Created {len(permissions)} permissions")
        return permissions

    def create_user_permissions(self, count, users, permissions):
        user_permissions = []
        
        for i in range(count):
            user_perm, created = UserPermission.objects.get_or_create(
                user=random.choice(users),
                permission=random.choice(permissions),
                defaults={'granted': random.choice([True, True, True, False])}
            )
            if created:
                user_permissions.append(user_perm)
        
        self.stdout.write(f"Created {len(user_permissions)} user permissions")
        return user_permissions

    def get_class_levels(self):
        """Return static class level choices as strings"""
        return [choice[0] for choice in CLASS_LEVEL_CHOICES]

    def create_students(self, count, class_levels):
        students = []
        genders = ['male', 'female']
        statuses = ['active', 'active', 'active', 'inactive', 'graduated', 'suspended']
        transportations = ['school_bus', 'private_vehicle', 'walking', 'public_transport']
        provinces = ['Kabul', 'Herat', 'Balkh', 'Kandahar', 'Nangarhar', 'Kunduz']
        
        for i in range(count):
            reg_num = f"STD-{i+1:05d}"
            tazkira = f"TZK-{i+1:06d}"
            
            student = Student.objects.create(
                full_name=fake.name(),
                father_name=fake.name_male(),
                grandfather_name=fake.name_male(),
                date_of_birth=fake.date_between(start_date='-18y', end_date='-6y'),
                gender=random.choice(genders),
                tazkira_number=tazkira,
                permanent_address=fake.address(),
                current_address=fake.address(),
                province=random.choice(provinces),
                district=fake.city(),
                area=fake.city_suffix(),
                parent_phone=fake.phone_number(),
                student_phone=fake.phone_number() if random.choice([True, False]) else '',
                registration_number=reg_num,
                registration_date=fake.date_between(start_date='-2y', end_date='today'),
                status=random.choice(statuses),
                class_level=random.choice(class_levels),
                transportation=random.choice(transportations),
            )
            students.append(student)
        
        self.stdout.write(f"Created {len(students)} students")
        return students

    def create_fee_types(self):
        fee_types = []
        fees_data = [
            ('Admission Fee', 'ADMISSION', 'admission', 500),
            ('Tuition Fee', 'TUITION', 'other', 1000),
            ('Book Fee', 'BOOK', 'book', 200),
            ('Uniform Fee', 'UNIFORM', 'uniform', 150),
            ('Transportation Fee', 'TRANSPORT', 'transportation', 100),
            ('Exam Fee', 'EXAM', 'exam', 50),
        ]
        
        for name, code, category, amount in fees_data:
            fee_type, created = FeeType.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'category': category,
                    'description': f'{name} for students',
                    'is_active': True,
                    'is_mandatory': True
                }
            )
            if created:
                fee_types.append(fee_type)
        
        self.stdout.write(f"Created {len(fee_types)} fee types")
        return FeeType.objects.all()

    def create_fee_assignments(self, students, fee_types, class_levels):
        assignments = []
        currencies = ['USD', 'AFN']
        fee_types_list = list(fee_types)
        
        for student in students[:100]:  # Assign to first 100 students
            num_fee_types = min(random.randint(2, 4), len(fee_types_list))
            for fee_type in random.sample(fee_types_list, k=num_fee_types):
                assignment = StudentFeeAssignment.objects.create(
                    student=student,
                    fee_type=fee_type,
                    class_level=student.class_level,
                    payment_plan=random.choice([1, 3, 12]),
                    amount=Decimal(str(random.randint(100, 2000))),
                    currency=random.choice(currencies),
                    is_mandatory=fee_type.is_mandatory,
                    is_active=True
                )
                assignments.append(assignment)
        
        self.stdout.write(f"Created {len(assignments)} fee assignments")
        return assignments

    def create_student_payments(self, assignments):
        payments = []
        statuses = ['pending', 'completed', 'completed', 'completed', 'cancelled']
        
        for assignment in assignments[:200]:  # Create payments for first 200 assignments
            months = random.sample(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], k=random.randint(1, 3))
            
            payment = StudentPayment.objects.create(
                assignment=assignment,
                amount=assignment.amount,
                currency=assignment.currency,
                payment_date=fake.date_between(start_date='-1y', end_date='today'),
                payment_status=random.choice(statuses),
                period_year=str(random.choice([2023, 2024, 2025])),
                period_month=random.choice(months),
                fee_type=assignment.fee_type,
                description=f'Payment for {assignment.fee_type.name}'
            )
            payments.append(payment)
        
        self.stdout.write(f"Created {len(payments)} student payments")
        return payments

    def create_shops(self, count):
        shops = []
        statuses = ['available', 'rented', 'maintenance', 'reserved']
        
        for i in range(count):
            shop = Shop.objects.create(
                shop_number=f"SHOP-{i+1:03d}",
                name=f"Shop {i+1}",
                location=fake.address(),
                area=Decimal(str(random.randint(20, 200))),
                monthly_rent=Decimal(str(random.randint(500, 5000))),
                currency='AFN',
                status=random.choice(statuses),
                description=fake.text(max_nb_chars=100)
            )
            shops.append(shop)
        
        self.stdout.write(f"Created {len(shops)} shops")
        return shops

    def create_tenants(self, count):
        tenants = []
        
        for i in range(count):
            tenant = Tenant.objects.create(
                full_name=fake.name(),
                phone=fake.phone_number(),
                email=fake.email(),
                address=fake.address(),
                tazkira_number=f"TTZK-{random.randint(100000, 999999)}",
                description=fake.text(max_nb_chars=50)
            )
            tenants.append(tenant)
        
        self.stdout.write(f"Created {len(tenants)} tenants")
        return tenants

    def create_rentals(self, shops, tenants):
        rentals = []
        statuses = ['active', 'active', 'active', 'expired', 'cancelled']
        
        for i, shop in enumerate(shops[:15]):  # Create rentals for first 15 shops
            rental = ShopRental.objects.create(
                shop=shop,
                tenant=tenants[i % len(tenants)],
                start_date=fake.date_between(start_date='-1y', end_date='-1m'),
                end_date=fake.date_between(start_date='today', end_date='+1y'),
                monthly_rent=shop.monthly_rent,
                currency=shop.currency,
                rental_status=random.choice(statuses),
                security_deposit=Decimal(str(random.randint(1000, 10000))),
                description=fake.text(max_nb_chars=50)
            )
            rentals.append(rental)
        
        self.stdout.write(f"Created {len(rentals)} rentals")
        return rentals

    def create_rental_payments(self, rentals):
        payments = []
        statuses = ['pending', 'completed', 'completed', 'completed', 'cancelled']
        calendar_types = ['shamsi', 'qamari']
        
        for rental in rentals:
            num_payments = random.randint(1, 5)
            for _ in range(num_payments):
                months = random.sample(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], k=random.randint(1, 3))
                
                payment = ShopRentalPayment.objects.create(
                    rental=rental,
                    amount=rental.monthly_rent,
                    currency=rental.currency,
                    payment_date=fake.date_between(start_date='-6m', end_date='today'),
                    payment_status=random.choice(statuses),
                    period_months=months,
                    period_year=str(random.choice([1402, 1403, 1404])),
                    calendar_type=random.choice(calendar_types),
                    description=f'Rental payment for {len(months)} month(s)'
                )
                payments.append(payment)
        
        self.stdout.write(f"Created {len(payments)} rental payments")
        return payments

    def create_transactions(self, accounts):
        transactions = []
        txn_types = ['student_payment', 'expense', 'payroll', 'rental_income', 'journal']
        
        for i in range(50):
            txn = Transaction.objects.create(
                date=fake.date_between(start_date='-1y', end_date='today'),
                description=fake.text(max_nb_chars=100),
                transaction_type=random.choice(txn_types),
                reference=f'REF-{i+1:04d}',
                is_posted=True
            )
            transactions.append(txn)
        
        self.stdout.write(f"Created {len(transactions)} transactions")
        return transactions

    def create_income_categories(self):
        categories = []
        types = ['service', 'miscellaneous', 'business', 'investment', 'other']
        names = ['Consulting', 'Interest', 'Dividends', 'Sales', 'Donations']
        
        for i, name in enumerate(names):
            cat, created = IncomeCategory.objects.get_or_create(
                name=name,
                defaults={
                    'category_type': types[i % len(types)],
                    'description': f'{name} income',
                    'is_active': True
                }
            )
            if created:
                categories.append(cat)
        
        self.stdout.write(f"Created {len(categories)} income categories")
        return IncomeCategory.objects.all()

    def create_other_incomes(self, categories):
        incomes = []
        
        for i in range(30):
            income = OtherIncome.objects.create(
                income_category=random.choice(categories),
                amount=Decimal(str(random.randint(100, 5000))),
                currency='AFN',
                income_date=fake.date_between(start_date='-1y', end_date='today'),
                source=fake.company(),
                description=fake.text(max_nb_chars=50)
            )
            incomes.append(income)
        
        self.stdout.write(f"Created {len(incomes)} other incomes")
        return incomes

    def create_activity_logs(self, count, users):
        logs = []
        actions = ['create', 'update', 'delete', 'view', 'export', 'login', 'logout']
        models = ['Employee', 'Expense', 'Payroll', 'Student', 'StudentPayment', 'Shop', 'Rental']
        
        for i in range(count):
            log = ActivityLog.objects.create(
                user=random.choice(users),
                action=random.choice(actions),
                model_name=random.choice(models),
                object_id=random.randint(1, 500),
                description=fake.text(max_nb_chars=150),
                ip_address=fake.ipv4(),
                user_agent=fake.user_agent()
            )
            logs.append(log)
        
        self.stdout.write(f"Created {len(logs)} activity logs")
        return logs
    
    def clear_existing_data(self):
        self.stdout.write('Clearing existing data...')
        
        # Clear in reverse order of dependencies
        ActivityLog.objects.all().delete()
        UserPermission.objects.all().delete()
        Permission.objects.all().delete()
        
        FinanceLedger.objects.all().delete()
        StudentPayment.objects.all().delete()
        StudentFeeAssignment.objects.all().delete()
        FeeType.objects.all().delete()
        
        ShopRentalPayment.objects.all().delete()
        ShopRental.objects.all().delete()
        Tenant.objects.all().delete()
        Shop.objects.all().delete()
        
        Student.objects.all().delete()
        
        # Clear transactions and journal entries (but keep accounts)
        JournalEntry.objects.all().delete()
        Transaction.objects.all().delete()
        # Keep FiscalYear, Account, and AccountCategory - created by init_chart_of_accounts
        
        OtherIncome.objects.all().delete()
        IncomeCategory.objects.all().delete()
        
        Payroll.objects.all().delete()
        Advance.objects.all().delete()
        Expense.objects.all().delete()
        ExpenseCategory.objects.all().delete()
        Employee.objects.all().delete()
        
        User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write('Existing data cleared')
