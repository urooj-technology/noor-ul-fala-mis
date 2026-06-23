from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
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
from api.models.data.accounting import Account, Transaction, JournalEntry, FiscalYear
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
        users = self.create_users(8)
        call_command('setup_permissions')
        permissions = list(Permission.objects.all())
        user_permissions = self.create_user_permissions(users, permissions)
        
        # Employee & HR
        employees = self.create_employees(12)
        advances = self.create_advances(10, employees)
        payrolls = self.create_payrolls(12, employees)
        
        # Expenses
        expense_categories = self.create_expense_categories(6)
        expenses = self.create_expenses(15, expense_categories, users)
        
        # Student & Education — 20 structured test records
        class_levels = self.get_class_levels()
        students = self.create_test_students()
        fee_types = self.create_fee_types()
        fee_assignments = self.create_fee_assignments(students, fee_types)
        student_payments = self.create_student_payments(students, fee_assignments)
        
        # Shop Rental
        shops = self.create_shops(6)
        tenants = self.create_tenants(5)
        rentals = self.create_rentals(shops, tenants)
        rental_payments = self.create_rental_payments(rentals)
        
        # Accounting - Get existing from init_chart_of_accounts
        accounts = Account.objects.all()
        fiscal_years = FiscalYear.objects.all()
        transactions = self.create_transactions(accounts)
        
        # Other Income
        income_categories = self.create_income_categories()
        other_incomes = self.create_other_incomes(income_categories)
        
        # Activity Logs
        activity_logs = self.create_activity_logs(30, users)
        
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
- Accounts: {len(accounts)}
- Fiscal Years: {len(fiscal_years)}
- Transactions: {len(transactions)}
- Income Categories: {len(income_categories)}
- Other Incomes: {len(other_incomes)}
- Activity Logs: {len(activity_logs)}
'''))

    def create_users(self, count):
        users = []
        roles = ['admin', 'accountant', 'registration_officer', 'cashier', 'teacher', 'viewer', 'hr_manager']

        admin_user = User.objects.filter(
            Q(email='admin@example.com') | Q(username='admin')
        ).first()
        if admin_user:
            admin_user.email = 'admin@example.com'
            admin_user.username = 'admin'
            admin_user.first_name = 'System'
            admin_user.last_name = 'Admin'
            admin_user.role = 'admin'
            admin_user.is_active = True
            admin_user.is_admin = True
            admin_user.is_staff = True
            admin_user.set_password('password123')
            admin_user.save()
            created = False
        else:
            admin_user = User.objects.create(
                email='admin@example.com',
                username='admin',
                first_name='System',
                last_name='Admin',
                role='admin',
                is_active=True,
                is_admin=True,
                is_staff=True,
                address='Kabul, Afghanistan',
                phone='0700000001',
            )
            admin_user.set_password('password123')
            admin_user.save()
            created = True
        users.append(admin_user)

        for i in range(count - 1):
            email = f"user{i+1}@example.com"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f"user{i+1}",
                    'first_name': fake.first_name(),
                    'last_name': fake.last_name(),
                    'role': random.choice(roles),
                    'is_active': True,
                    'address': fake.address(),
                    'phone': f"070{i+2:07d}"[:10],
                }
            )
            if created:
                user.set_password('password123')
                user.save()
                users.append(user)
            else:
                users.append(user)
        
        self.stdout.write(f"Prepared {len(users)} users (login: admin@example.com / password123)")
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
        currencies = ['USD', 'AFN']
        
        for i in range(count):
            employee = random.choice(employees)
            advance = Advance.objects.create(
                employee=employee,
                amount=Decimal(str(random.randint(100, 2000))),
                currency=random.choice(currencies),
                reason=fake.text(max_nb_chars=100),
                year=random.choice([1403, 1404, 1405]),
                month=random.randint(1, 12),
                payment_date=fake.date_between(start_date='-1y', end_date='today'),
            )
            advances.append(advance)
        
        self.stdout.write(f"Created {len(advances)} advances")
        return advances

    def create_payrolls(self, count, employees):
        payrolls = []
        currencies = ['USD', 'AFN']
        
        for i in range(count):
            employee = random.choice(employees)
            payroll = Payroll.objects.create(
                employee=employee,
                month=random.randint(1, 12),
                year=random.choice([1403, 1404, 1405]),
                salary=Decimal(str(random.randint(500, 5000))),
                currency=random.choice(currencies),
                payment_date=fake.date_between(start_date='-1y', end_date='today'),
            )
            payrolls.append(payroll)
        
        self.stdout.write(f"Created {len(payrolls)} payrolls")
        return payrolls

    def create_permissions(self, count):
        """Deprecated — use setup_permissions management command instead."""
        return list(Permission.objects.all())

    def create_user_permissions(self, users, permissions):
        user_permissions = []
        admin_users = [u for u in users if getattr(u, 'is_admin', False) or u.role in ('admin', 'super_admin')]

        for user in admin_users:
            for permission in permissions:
                user_perm, created = UserPermission.objects.get_or_create(
                    user=user,
                    permission=permission,
                    defaults={'granted': True},
                )
                if created:
                    user_permissions.append(user_perm)

        for user in users:
            if user in admin_users:
                continue
            sample = random.sample(permissions, k=min(8, len(permissions)))
            for permission in sample:
                user_perm, created = UserPermission.objects.get_or_create(
                    user=user,
                    permission=permission,
                    defaults={'granted': random.choice([True, True, False])},
                )
                if created:
                    user_permissions.append(user_perm)

        self.stdout.write(f"Created {len(user_permissions)} user permissions")
        return user_permissions

    def get_class_levels(self):
        """Return static class level choices as strings"""
        return [choice[0] for choice in CLASS_LEVEL_CHOICES]

    FEE_TYPE_AMOUNTS = {
        'ADMISSION': Decimal('500'),
        'TUITION': Decimal('1000'),
        'BOOK': Decimal('200'),
        'UNIFORM': Decimal('150'),
        'TRANSPORT': Decimal('100'),
        'EXAM': Decimal('50'),
    }

    def _registration_date_for_bucket(self, bucket):
        today = timezone.localdate()
        if bucket == 'today':
            return today
        if bucket == 'tomorrow':
            return today + timedelta(days=1)
        if bucket == 'yesterday':
            return today - timedelta(days=1)
        if bucket == 'this_week':
            week_start = today - timedelta(days=today.weekday())
            candidate = today - timedelta(days=2)
            if candidate >= week_start:
                return candidate
            return week_start
        if bucket == 'this_month':
            first_of_month = today.replace(day=1)
            candidate = first_of_month + timedelta(days=3)
            if candidate >= today:
                candidate = first_of_month + timedelta(days=1)
            return candidate
        if bucket == 'last_month':
            first_this_month = today.replace(day=1)
            return first_this_month - timedelta(days=10)
        if bucket == 'last_year':
            return today.replace(year=today.year - 1, month=3, day=15)
        return today

    def create_test_students(self):
        """Create 20 students with deliberate registration dates for filter/print testing."""
        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)

        test_records = [
            # 6 registered today
            ('Ahmad Rahimi', 'Karim Rahimi', 'today', '1', 'school_bus', 'full', 'Karte Seh, District 3, Kabul'),
            ('Fatima Ahmadi', 'Hassan Ahmadi', 'today', '2', 'private_vehicle', 'partial', 'Karte Char, District 5, Kabul'),
            ('Omar Stanikzai', 'Jawad Stanikzai', 'today', '3', 'walking', 'none', 'Macrorayan, District 9, Kabul'),
            ('Sara Mohammadi', 'Ali Mohammadi', 'today', '4', 'public_transport', 'full', 'Khushal Khan Mena, Kabul'),
            ('Hamid Noori', 'Basir Noori', 'today', '5', 'school_bus', 'partial', 'Pul-e-Sokhta, District 6, Kabul'),
            ('Laila Hosseini', 'Rahim Hosseini', 'today', '6', 'school_bus', 'none', 'Taimani, District 4, Kabul'),
            # 6 registered tomorrow
            ('Yusuf Azizi', 'Nadir Azizi', 'tomorrow', '7', 'school_bus', 'full', 'Shahr-e-Naw, District 10, Kabul'),
            ('Mariam Safi', 'Daud Safi', 'tomorrow', '8', 'private_vehicle', 'partial', 'Bagrami, District 12, Kabul'),
            ('Bilal Wardak', 'Fazal Wardak', 'tomorrow', '9', 'walking', 'none', 'Dasht-e-Barchi, District 13, Kabul'),
            ('Zainab Popal', 'Ghulam Popal', 'tomorrow', '10', 'public_transport', 'full', 'Qala-e-Fathullah, Kabul'),
            ('Najib Danish', 'Wahid Danish', 'tomorrow', '11', 'school_bus', 'partial', 'Karte Parwan, Kabul'),
            ('Hadia Amiri', 'Sediq Amiri', 'tomorrow', '12', 'school_bus', 'none', 'Afshar, District 5, Kabul'),
            # 2 earlier this week
            ('Khalid Frotan', 'Mir Frotan', 'yesterday', '3', 'school_bus', 'full', 'Karte Sakhi, Kabul'),
            ('Parwana Ghazni', 'Latif Ghazni', 'this_week', '4', 'walking', 'partial', 'Company, District 7, Kabul'),
            # 3 earlier this month
            ('Rashid Kakar', 'Samim Kakar', 'this_month', '5', 'public_transport', 'full', 'Wazir Akbar Khan, Kabul'),
            ('Shabnam Taraki', 'Anwar Taraki', 'this_month', '6', 'school_bus', 'partial', 'Kolola Pushta, Kabul'),
            ('Imran Barakzai', 'Younas Barakzai', 'this_month', '7', 'private_vehicle', 'none', 'Deh Afghanan, Kabul'),
            # 2 last month
            ('Nadia Kohistani', 'Farid Kohistani', 'last_month', '8', 'school_bus', 'full', 'Chahar Asyab, Kabul'),
            ('Farhad Shinwari', 'Zmarai Shinwari', 'last_month', '9', 'walking', 'partial', 'Bibi Mahro, Kabul'),
            # 1 last year
            ('Amina Yusufzai', 'Ikram Yusufzai', 'last_year', '10', 'school_bus', 'none', 'Wazir Mohammad Akbar Khan, Kabul'),
        ]

        students = []
        genders = ['male', 'female']
        provinces = ['Kabul', 'Herat', 'Balkh', 'Kandahar']

        for index, (full_name, father_name, bucket, class_level, transport, payment_profile, address) in enumerate(test_records, start=1):
            reg_date = self._registration_date_for_bucket(bucket)
            reg_num = f"TEST-{today.year}-{index:03d}"
            tazkira = f"TZK-TEST-{index:05d}"

            student = Student.objects.create(
                full_name=full_name,
                father_name=father_name,
                grandfather_name=fake.name_male(),
                date_of_birth=fake.date_between(start_date='-16y', end_date='-7y'),
                gender=genders[index % 2],
                tazkira_number=tazkira,
                permanent_address=address,
                current_address=address,
                province=random.choice(provinces),
                district='Kabul City',
                area=address.split(',')[0],
                parent_phone=f"070{index:07d}"[:10],
                student_phone=f"078{index:07d}"[:10] if index % 3 == 0 else '',
                alternative_phone=f"079{index:07d}"[:10] if index % 4 == 0 else '',
                registration_number=reg_num,
                registration_date=reg_date,
                status='active',
                class_level=class_level,
                transportation=transport,
            )
            student._payment_profile = payment_profile  # used when creating payments
            students.append(student)

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {len(students)} test students "
                f"(6 today, 6 tomorrow, 2 this week, 3 this month, 2 last month, 1 last year)"
            )
        )
        self.stdout.write(f"  Today: {today} | Tomorrow: {tomorrow}")
        return students

    def create_students(self, count, class_levels):
        """Legacy helper — redirects to structured test data."""
        return self.create_test_students()

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

    def create_fee_assignments(self, students, fee_types):
        assignments = []
        fee_types_list = list(fee_types)

        for student in students:
            for fee_type in fee_types_list:
                amount = self.FEE_TYPE_AMOUNTS.get(fee_type.code, Decimal('100'))
                assignment = StudentFeeAssignment.objects.create(
                    student=student,
                    fee_type=fee_type,
                    class_level=student.class_level,
                    payment_plan=12 if fee_type.code == 'TUITION' else 1,
                    amount=amount,
                    currency='AFN',
                    is_mandatory=fee_type.is_mandatory,
                    is_active=True,
                    notes=f'Standard {fee_type.name} for class {student.class_level}',
                )
                assignments.append(assignment)

        self.stdout.write(f"Created {len(assignments)} fee assignments ({len(fee_types_list)} per student)")
        return assignments

    def create_student_payments(self, students, assignments):
        payments = []
        assignments_by_student = {}
        for assignment in assignments:
            assignments_by_student.setdefault(assignment.student_id, []).append(assignment)

        partial_fee_codes = {'ADMISSION', 'BOOK', 'EXAM'}

        for student in students:
            profile = getattr(student, '_payment_profile', 'none')
            student_assignments = assignments_by_student.get(student.id, [])
            payment_date = student.registration_date

            if profile == 'none':
                continue

            for assignment in student_assignments:
                should_pay = profile == 'full' or (
                    profile == 'partial' and assignment.fee_type.code in partial_fee_codes
                )
                if not should_pay:
                    continue

                pay_amount = assignment.amount
                if profile == 'partial' and assignment.fee_type.code == 'ADMISSION':
                    pay_amount = (assignment.amount * Decimal('0.5')).quantize(Decimal('1'))

                payment = StudentPayment.objects.create(
                    assignment=assignment,
                    amount=pay_amount,
                    currency=assignment.currency,
                    payment_date=payment_date,
                    payment_status='completed',
                    period_year=str(payment_date.year),
                    period_month=f'{payment_date.month:02d}',
                    fee_type=assignment.fee_type,
                    description=f'Payment for {assignment.fee_type.name} — {student.full_name}',
                )
                payments.append(payment)

        self.stdout.write(
            f"Created {len(payments)} completed student payments "
            f"(full/partial/none profiles across 20 students)"
        )
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
        
        for i, shop in enumerate(shops[:5]):
            rental = ShopRental.objects.create(
                shop=shop,
                tenant=tenants[i % len(tenants)],
                start_date=fake.date_between(start_date='-1y', end_date='-1m'),
                end_date=fake.date_between(start_date='today', end_date='+1y'),
                monthly_rent=Decimal(str(random.randint(500, 5000))),
                currency='AFN',
                rental_status=random.choice(statuses),
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
        # Keep FiscalYear and Account - created by init_chart_of_accounts
        
        OtherIncome.objects.all().delete()
        IncomeCategory.objects.all().delete()
        
        Payroll.objects.all().delete()
        Advance.objects.all().delete()
        Expense.objects.all().delete()
        ExpenseCategory.objects.all().delete()
        Employee.objects.all().delete()
        
        User.objects.filter(is_superuser=False).delete()
        
        self.stdout.write('Existing data cleared')
