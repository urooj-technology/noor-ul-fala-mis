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
from api.models.data.equipment import EquipmentCategory, Equipment, EquipmentStockMovement

fake = Faker()

# Realistic Afghan school / business data
AFGHAN_EMPLOYEE_NAMES = [
    ('Mohammad Ehsan', 'Principal', 45000),
    ('Freshta Nazari', 'Vice Principal', 38000),
    ('Abdul Qadir Hamidi', 'Accountant', 32000),
    ('Zarghona Amiri', 'Teacher', 28000),
    ('Sayed Jamaluddin', 'Teacher', 26000),
    ('Parwana Karimi', 'Teacher', 27000),
    ('Rahimullah Safi', 'Security Guard', 15000),
    ('Najia Mohammadi', 'Cleaner', 12000),
    ('Hamidullah Stanikzai', 'IT Support', 22000),
    ('Mariam Popal', 'Librarian', 18000),
    ('Bashir Ahmadzai', 'Driver', 16000),
    ('Shabana Wardak', 'Nurse', 20000),
]

EXPENSE_CATEGORY_DATA = [
    ('Office Supplies', 'Stationery, paper, pens'),
    ('Utilities', 'Electricity and water bills'),
    ('Maintenance', 'Building and equipment repairs'),
    ('Transportation', 'School bus fuel and maintenance'),
    ('Training', 'Staff professional development'),
    ('Insurance', 'Property and liability insurance'),
]

EQUIPMENT_CATEGORY_DATA = [
    ('Furniture', 'Desks, chairs, cabinets'),
    ('Computers', 'Laptops, desktops, printers'),
    ('Sports Equipment', 'Balls, nets, gym items'),
    ('Lab Equipment', 'Science lab tools'),
]

EQUIPMENT_ITEM_DATA = [
    ('Student Desk', 'Furniture', 'DESK-001', 3500, 'Local', 'Standard'),
    ('Teacher Chair', 'Furniture', 'CHAIR-001', 1200, 'Local', 'Ergonomic'),
    ('HP Laptop', 'Computers', 'LAP-001', 45000, 'HP', 'ProBook 450'),
    ('Dell Desktop', 'Computers', 'PC-001', 38000, 'Dell', 'OptiPlex'),
    ('Canon Printer', 'Computers', 'PRT-001', 15000, 'Canon', 'LBP6030'),
    ('Football', 'Sports Equipment', 'BALL-001', 800, 'Nike', 'Size 5'),
    ('Volleyball Net', 'Sports Equipment', 'NET-001', 2500, 'Local', 'Standard'),
    ('Microscope', 'Lab Equipment', 'MIC-001', 12000, 'Olympus', 'CX23'),
]


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
        
        # Equipment / Inventory
        equipment_categories = self.create_equipment_categories()
        equipment_items = self.create_equipment(equipment_categories, users)

        # Accounting - accounts created by init_chart_of_accounts; journals via signals
        accounts = Account.objects.all()
        fiscal_years = FiscalYear.objects.all()
        
        # Other Income
        income_categories = self.create_income_categories()
        other_incomes = self.create_other_incomes(income_categories)
        
        # Activity Logs
        activity_logs = self.create_activity_logs(30, users)

        # Opening cash balance so books reflect realistic starting capital
        self.create_opening_balances()
        
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
- Equipment Categories: {len(equipment_categories)}
- Equipment Items: {len(equipment_items)}
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

    def _sample_date(self, current_month_weight=0.4):
        """Return a date weighted toward the current month for report testing."""
        today = timezone.localdate()
        month_start = today.replace(day=1)
        roll = random.random()
        if roll < current_month_weight:
            days_in_month = (today - month_start).days
            offset = random.randint(0, max(0, days_in_month))
            return month_start + timedelta(days=offset)
        if roll < current_month_weight + 0.3:
            last_month_end = month_start - timedelta(days=1)
            last_month_start = last_month_end.replace(day=1)
            span = (last_month_end - last_month_start).days
            return last_month_start + timedelta(days=random.randint(0, span))
        return fake.date_between(start_date='-1y', end_date=month_start - timedelta(days=1))

    def create_employees(self, count):
        employees = []
        names = AFGHAN_EMPLOYEE_NAMES[:count]
        if len(names) < count:
            for i in range(count - len(names)):
                names.append((fake.name(), random.choice(['Teacher', 'Staff']), random.randint(12000, 35000)))

        for full_name, position, salary in names:
            employee = Employee.objects.create(
                full_name=full_name,
                phone=f"070{random.randint(1000000, 9999999)}",
                address=f"Kabul, District {random.randint(1, 15)}",
                position=position,
                salary=Decimal(str(salary)),
                currency='AFN',
                is_active=True,
            )
            employees.append(employee)
        
        self.stdout.write(f"Created {len(employees)} employees")
        return employees

    def create_expense_categories(self, count):
        categories = []
        for name, description in EXPENSE_CATEGORY_DATA[:count]:
            category = ExpenseCategory.objects.create(name=name, description=description)
            categories.append(category)
        while len(categories) < count:
            category = ExpenseCategory.objects.create(
                name=f"Miscellaneous {len(categories) + 1}",
                description=fake.text(max_nb_chars=80),
            )
            categories.append(category)
        
        self.stdout.write(f"Created {len(categories)} expense categories")
        return categories

    def create_expenses(self, count, categories, users):
        expenses = []
        expense_amounts = [500, 1200, 3500, 800, 2200, 1500, 4500, 900, 600, 1800]
        
        for i in range(count):
            expense = Expense.objects.create(
                category=random.choice(categories),
                amount=Decimal(str(expense_amounts[i % len(expense_amounts)])),
                currency='AFN',
                expense_date=self._sample_date(),
                description=f"Payment for {categories[i % len(categories)].name}",
                user=random.choice(users) if users else None
            )
            expenses.append(expense)
        
        self.stdout.write(f"Created {len(expenses)} expenses")
        return expenses

    def create_advances(self, count, employees):
        advances = []
        today = timezone.localdate()
        shamsi_year = 1404
        
        for i in range(count):
            employee = employees[i % len(employees)]
            pay_date = self._sample_date()
            advance = Advance.objects.create(
                employee=employee,
                amount=Decimal(str(random.choice([2000, 3000, 5000, 6000, 8000]))),
                currency='AFN',
                reason=f"Salary advance for {employee.full_name}",
                year=shamsi_year,
                month=pay_date.month,
                payment_date=pay_date,
            )
            advances.append(advance)
        
        self.stdout.write(f"Created {len(advances)} advances")
        return advances

    def create_payrolls(self, count, employees):
        payrolls = []
        shamsi_year = 1404
        
        for i in range(count):
            employee = employees[i % len(employees)]
            pay_date = self._sample_date()
            payroll = Payroll.objects.create(
                employee=employee,
                month=pay_date.month,
                year=shamsi_year,
                salary=employee.salary,
                currency='AFN',
                payment_date=pay_date,
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
        shop_data = [
            ('SHOP-001', 'Ground Floor Unit A', 'Main Building, Ground Floor', 45, 'rented'),
            ('SHOP-002', 'Ground Floor Unit B', 'Main Building, Ground Floor', 38, 'rented'),
            ('SHOP-003', 'First Floor Unit A', 'Main Building, First Floor', 32, 'rented'),
            ('SHOP-004', 'First Floor Unit B', 'Main Building, First Floor', 28, 'available'),
            ('SHOP-005', 'Annex Shop 1', 'Annex Building', 55, 'rented'),
            ('SHOP-006', 'Annex Shop 2', 'Annex Building', 40, 'maintenance'),
        ]
        
        for i in range(count):
            if i < len(shop_data):
                num, name, loc, area, status = shop_data[i]
            else:
                num, name, loc, area, status = (
                    f"SHOP-{i+1:03d}", f"Shop {i+1}", 'Kabul City', random.randint(25, 60), 'available'
                )
            shop = Shop.objects.create(
                shop_number=num,
                name=name,
                location=loc,
                area=Decimal(str(area)),
                status=status,
                description=f"Commercial unit {name}",
            )
            shops.append(shop)
        
        self.stdout.write(f"Created {len(shops)} shops")
        return shops

    def create_tenants(self, count):
        tenants = []
        tenant_data = [
            ('Ahmad Shah Bookstore', '0701234567', 'books@example.com'),
            ('Fatima Tailoring', '0702345678', 'tailor@example.com'),
            ('Noor Stationery', '0703456789', 'stationery@example.com'),
            ('Kabul Electronics', '0704567890', 'electronics@example.com'),
            ('Green Grocery', '0705678901', 'grocery@example.com'),
        ]
        
        for i in range(count):
            if i < len(tenant_data):
                name, phone, email = tenant_data[i]
            else:
                name, phone, email = fake.name(), f"070{random.randint(1000000, 9999999)}", fake.email()
            tenant = Tenant.objects.create(
                full_name=name,
                phone=phone,
                email=email,
                address='Kabul, Afghanistan',
                tazkira_number=f"TTZK-{random.randint(100000, 999999)}",
                description=f"Tenant: {name}",
            )
            tenants.append(tenant)
        
        self.stdout.write(f"Created {len(tenants)} tenants")
        return tenants

    def create_rentals(self, shops, tenants):
        rentals = []
        rent_amounts = [8200, 7500, 6800, 5500, 9200]
        
        for i, shop in enumerate(shops[:5]):
            rental = ShopRental.objects.create(
                shop=shop,
                tenant=tenants[i % len(tenants)],
                start_date=date.today() - timedelta(days=180),
                end_date=date.today() + timedelta(days=365),
                monthly_rent=Decimal(str(rent_amounts[i % len(rent_amounts)])),
                currency='AFN',
                rental_status='active',
                description=f"Rental agreement for {shop.name}",
            )
            rentals.append(rental)
        
        self.stdout.write(f"Created {len(rentals)} rentals")
        return rentals

    def create_rental_payments(self, rentals):
        payments = []
        today = timezone.localdate()
        month_start = today.replace(day=1)
        
        for rental in rentals:
            # Current month payment (completed)
            payments.append(ShopRentalPayment.objects.create(
                rental=rental,
                amount=rental.monthly_rent,
                currency='AFN',
                payment_date=month_start + timedelta(days=min(5, (today - month_start).days)),
                payment_status='completed',
                period_months=[f'{today.month:02d}'],
                period_year='1404',
                calendar_type='shamsi',
                description=f'Rent for {rental.shop.name} — current month',
            ))
            # One prior month payment
            prior = month_start - timedelta(days=15)
            payments.append(ShopRentalPayment.objects.create(
                rental=rental,
                amount=rental.monthly_rent,
                currency='AFN',
                payment_date=prior,
                payment_status='completed',
                period_months=[f'{(today.month - 1) or 12:02d}'],
                period_year='1404',
                calendar_type='shamsi',
                description=f'Rent for {rental.shop.name} — prior month',
            ))
        
        self.stdout.write(f"Created {len(payments)} rental payments")
        return payments

    def create_transactions(self, accounts):
        """Deprecated — journal entries are created via signals when source documents are saved."""
        return []

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
        income_sources = [
            ('Consulting fee — curriculum design', 12000),
            ('Donation from alumni', 25000),
            ('Interest on bank deposit', 3500),
            ('Sale of old furniture', 4500),
            ('Event sponsorship', 18000),
        ]
        
        for i, (desc, amount) in enumerate(income_sources):
            income = OtherIncome.objects.create(
                income_category=random.choice(categories),
                amount=Decimal(str(amount)),
                currency='AFN',
                income_date=self._sample_date(),
                source=desc.split('—')[0].strip() if '—' in desc else desc,
                description=desc,
            )
            incomes.append(income)
        
        # Additional random incomes
        for i in range(10):
            income = OtherIncome.objects.create(
                income_category=random.choice(categories),
                amount=Decimal(str(random.choice([2000, 5000, 8000, 15000]))),
                currency='AFN',
                income_date=self._sample_date(0.3),
                source=fake.company(),
                description=f'Miscellaneous income #{i + 1}',
            )
            incomes.append(income)
        
        self.stdout.write(f"Created {len(incomes)} other incomes")
        return incomes

    def create_equipment_categories(self):
        categories = []
        for name, description in EQUIPMENT_CATEGORY_DATA:
            cat = EquipmentCategory.objects.create(name=name, description=description, is_active=True)
            categories.append(cat)
        self.stdout.write(f"Created {len(categories)} equipment categories")
        return categories

    def create_equipment(self, categories, users):
        items = []
        cat_by_name = {c.name: c for c in categories}
        admin = users[0] if users else None

        for name, cat_name, barcode, price, brand, model in EQUIPMENT_ITEM_DATA:
            category = cat_by_name.get(cat_name)
            if not category:
                continue
            item = Equipment.objects.create(
                category=category,
                name=name,
                barcode=barcode,
                unit_price=Decimal(str(price)),
                brand=brand,
                model=model,
                description=f'{brand} {model} — {name}',
                stock_category_1=random.randint(5, 20),
                stock_category_2=random.randint(0, 5),
                stock_category_3=random.randint(0, 3),
                stock_category_4=random.randint(0, 2),
                stock_category_5=random.randint(0, 5),
                is_active=True,
            )
            items.append(item)
            if item.stock_category_1 > 0 and admin:
                EquipmentStockMovement.objects.create(
                    equipment=item,
                    from_category=None,
                    to_category=1,
                    quantity=item.stock_category_1,
                    notes='Initial stock on setup',
                    moved_by=admin,
                )
        self.stdout.write(f"Created {len(items)} equipment items")
        return items

    def create_opening_balances(self):
        """Post opening cash from owner's capital — realistic starting balance for demo."""
        from api.services.accounting_service import AccountingService

        opening_date = date.today().replace(month=1, day=1)
        opening_amount = Decimal('500000')

        for currency in ('AFN',):
            cash = Account.objects.filter(code=f'1000_{currency}', is_active=True).first()
            equity = Account.objects.filter(code=f'3000_{currency}', is_active=True).first()
            if not cash or not equity:
                continue
            AccountingService.create_journal_entry(
                date=opening_date,
                description=f'Opening balance — {currency}',
                transaction_type='journal',
                reference=f'OPENING-{currency}-{opening_date.year}',
                lines=[
                    {'account_id': cash.id, 'debit': opening_amount, 'credit': Decimal('0')},
                    {'account_id': equity.id, 'debit': Decimal('0'), 'credit': opening_amount},
                ],
            )
        self.stdout.write('Created opening cash balance (500,000 AFN)')

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

        EquipmentStockMovement.objects.all().delete()
        Equipment.objects.all().delete()
        EquipmentCategory.objects.all().delete()
        
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
