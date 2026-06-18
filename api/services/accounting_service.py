from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from api.models.data.accounting import Account, JournalEntry, Transaction


class AccountingService:
    """Service layer for accounting operations - ensures double-entry integrity"""
    
    CURRENCIES = ['AFN', 'USD']
    
    @staticmethod
    @transaction.atomic
    def create_journal_entry(date, description, lines, transaction_type='journal', reference=None):
        """
        Create a balanced journal entry.
        
        Args:
            date: Transaction date
            description: Transaction description
            lines: List of dicts with 'account_id', 'debit', 'credit'
            transaction_type: Type of transaction
            reference: Optional reference number
        
        Returns:
            Transaction object
        """
        # Validate balance
        total_debit = sum(Decimal(str(line.get('debit', 0))) for line in lines)
        total_credit = sum(Decimal(str(line.get('credit', 0))) for line in lines)
        
        if abs(total_debit - total_credit) > Decimal('0.01'):
            raise ValueError(f"Transaction not balanced. Debit: {total_debit}, Credit: {total_credit}")
        
        # Create transaction
        txn = Transaction.objects.create(
            date=date,
            description=description,
            transaction_type=transaction_type,
            reference=reference
        )
        
        # Create journal entries
        for line in lines:
            account = Account.objects.get(id=line['account_id'])
            JournalEntry.objects.create(
                date=date,
                account=account,
                debit=Decimal(str(line.get('debit', 0))),
                credit=Decimal(str(line.get('credit', 0))),
                description=description,
                reference=reference,
                transaction=txn
            )
        
        return txn
    
    @staticmethod
    def _active_journal_entries(account):
        return account.journal_entries.filter(is_deleted=False, transaction__is_deleted=False)

    @staticmethod
    def _get_account_balance(account, as_of_date=None, start_date=None, end_date=None):
        """Calculate account balance from active journal entries with optional date filtering."""
        from django.db.models import Sum

        entries = AccountingService._active_journal_entries(account)

        if as_of_date:
            entries = entries.filter(date__lte=as_of_date)
        if start_date:
            entries = entries.filter(date__gte=start_date)
        if end_date:
            entries = entries.filter(date__lte=end_date)
        
        debits = entries.aggregate(total=Sum('debit'))['total'] or Decimal('0')
        credits = entries.aggregate(total=Sum('credit'))['total'] or Decimal('0')
        
        # Asset/Expense: Debit increases, Credit decreases
        if account.account_type in ['asset', 'expense']:
            return debits - credits
        # Liability/Equity/Income: Credit increases, Debit decreases
        return credits - debits

    @staticmethod
    def recalculate_all_account_balances():
        """Refresh cached account balances from active journal entries."""
        for account in Account.objects.all():
            account.refresh_balance()

    @staticmethod
    @transaction.atomic
    def record_student_payment(student_id, amount, date, description, reference=None, payment_cycle='monthly', currency='AFN'):
        """Record a student payment as a journal entry

        Args:
            student_id: Student primary key
            amount: Payment amount (Decimal or numeric)
            date: Payment date
            description: Human-readable description
            reference: Reference / receipt number (optional)
            payment_cycle: 'monthly' or 'yearly'
            currency: Currency code (AFN or USD)
        """
        from api.models.data.student import Student
        from api.models.data.accounting import Account
        
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        receivable_account = Account.objects.filter(code=f'1200_{currency}').first()

        if not cash_account or not receivable_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        cycle_label = payment_cycle.capitalize() if payment_cycle else ''
        full_description = description
        if cycle_label:
            full_description = f"[{cycle_label}] {description}"

        # Payment: Debit Cash, Credit Accounts Receivable
        return AccountingService.create_journal_entry(
            date=date,
            description=f"Student Payment - {full_description}",
            lines=[
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
                {'account_id': receivable_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='student_payment',
            reference=reference
        )

    @staticmethod
    @transaction.atomic
    def record_student_fee_assignment(assignment, amount=None, date=None, reference=None, description=None, currency=None):
        """Record assigned student fees as receivable and revenue.

        Dr Accounts Receivable
        Cr Student Fees Revenue
        """
        amount = Decimal(str(amount if amount is not None else assignment.amount))
        if amount <= 0:
            return None

        currency = currency or assignment.currency or 'AFN'
        receivable_account = Account.objects.filter(code=f'1200_{currency}').first()
        revenue_account = Account.objects.filter(code=f'4000_{currency}').first()

        if not receivable_account or not revenue_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        student = assignment.student
        fee_type_name = assignment.fee_type.name if assignment.fee_type else 'Fee'
        class_level = assignment.class_level or ''
        description = description or f"Fee Assignment - {student.full_name} - {fee_type_name}"
        if class_level:
            description = f"{description} ({class_level})"

        return AccountingService.create_journal_entry(
            date=date or timezone.now().date(),
            description=description,
            lines=[
                {'account_id': receivable_account.id, 'debit': amount, 'credit': 0},
                {'account_id': revenue_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='student_payment',
            reference=reference or f"FEE-ASSIGN-{assignment.id}"
        )

    @staticmethod
    @transaction.atomic
    def record_student_fee_assignment_reversal(assignment, amount, date=None, reference=None, description=None, currency=None):
        """Reverse assigned student fees when an assignment total is reduced."""
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        currency = currency or assignment.currency or 'AFN'
        receivable_account = Account.objects.filter(code=f'1200_{currency}').first()
        revenue_account = Account.objects.filter(code=f'4000_{currency}').first()

        if not receivable_account or not revenue_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        student = assignment.student
        fee_type_name = assignment.fee_type.name if assignment.fee_type else 'Fee'

        return AccountingService.create_journal_entry(
            date=date or timezone.now().date(),
            description=description or f"Fee Assignment Reduction - {student.full_name} - {fee_type_name}",
            lines=[
                {'account_id': revenue_account.id, 'debit': amount, 'credit': 0},
                {'account_id': receivable_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='student_payment',
            reference=reference or f"FEE-ASSIGN-REV-{assignment.id}"
        )

    @staticmethod
    @transaction.atomic
    def record_student_payment_reversal(student_id, amount, date, description, reference=None, currency='AFN'):
        """Reverse a student payment when a completed payment is reduced/cancelled."""
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        receivable_account = Account.objects.filter(code=f'1200_{currency}').first()

        if not cash_account or not receivable_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        return AccountingService.create_journal_entry(
            date=date,
            description=f"Student Payment Reversal - {description}",
            lines=[
                {'account_id': receivable_account.id, 'debit': amount, 'credit': 0},
                {'account_id': cash_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='student_payment',
            reference=reference
        )
    
    @staticmethod
    @transaction.atomic
    def record_expense(amount, date, description, expense_category, reference=None, currency='AFN'):
        """Record an expense as a journal entry - defaults to Other Expenses account"""
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        expense_account = Account.objects.filter(code=f'5900_{currency}').first()
        
        if not cash_account or not expense_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")
        
        return AccountingService.create_journal_entry(
            date=date,
            description=f"Expense - {expense_category}: {description}",
            lines=[
                {'account_id': expense_account.id, 'debit': amount, 'credit': 0},
                {'account_id': cash_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='expense',
            reference=reference
        )
    
    @staticmethod
    @transaction.atomic
    def record_payroll(employee_name, amount, date, reference=None, currency='AFN'):
        """Record payroll payment"""
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        salary_account = Account.objects.filter(code=f'5000_{currency}').first()
        
        if not cash_account or not salary_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")
        
        return AccountingService.create_journal_entry(
            date=date,
            description=f"Salary Payment - {employee_name}",
            lines=[
                {'account_id': salary_account.id, 'debit': amount, 'credit': 0},
                {'account_id': cash_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='payroll',
            reference=reference
        )
    
    @staticmethod
    @transaction.atomic
    def record_advance(employee_name, amount, date, reference=None, currency='AFN'):
        """Record advance payment (Dr Employee Advances, Cr Cash)."""
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        advance_account = Account.objects.filter(code=f'1210_{currency}').first()

        if not cash_account or not advance_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        return AccountingService.create_journal_entry(
            date=date,
            description=f"Advance Payment - {employee_name}",
            lines=[
                {'account_id': advance_account.id, 'debit': amount, 'credit': 0},
                {'account_id': cash_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='advance',
            reference=reference
        )

    @staticmethod
    def ensure_fee_assignment_journal(assignment):
        """Create fee-assignment journal (Dr Receivable, Cr Revenue) if missing."""
        from api.models.data.accounting import Transaction

        if assignment.is_deleted or not assignment.is_active:
            return None

        amount = Decimal(str(assignment.amount or 0))
        if amount <= 0:
            return None

        reference = f"FEE-ASSIGN-{assignment.id}"
        if Transaction.objects.filter(reference=reference, is_deleted=False).exists():
            return None

        return AccountingService.record_student_fee_assignment(
            assignment=assignment,
            amount=amount,
            reference=reference,
        )

    @staticmethod
    def ensure_advance_journal(advance):
        """Create the advance journal entry if it does not already exist."""
        if advance.is_deleted:
            return None

        reference = f"ADVANCE-{advance.id}"
        if Transaction.objects.filter(reference=reference).exists():
            return None

        return AccountingService.record_advance(
            employee_name=advance.employee.full_name,
            amount=advance.amount,
            date=advance.payment_date,
            reference=reference,
            currency=advance.currency or 'AFN',
        )

    @staticmethod
    def _expense_account_for_category(category, currency):
        category_name = category.name.lower() if category else ''
        if 'salary' in category_name or 'wage' in category_name:
            account = Account.objects.filter(code=f'5000_{currency}').first()
        else:
            account = Account.objects.filter(code=f'5900_{currency}').first()
        return account or Account.objects.filter(code=f'5900_{currency}').first()

    @staticmethod
    @transaction.atomic
    def reverse_journal_by_reference(reference, date=None, reversal_reference=None, description=None):
        """Post a reversing journal entry for an existing source-document transaction."""
        original = (
            Transaction.objects.filter(reference=reference)
            .prefetch_related('entries')
            .first()
        )
        if not original:
            return None

        rev_ref = reversal_reference or f"{reference}-VOID"
        if Transaction.objects.filter(reference=rev_ref).exists():
            return Transaction.objects.filter(reference=rev_ref).first()

        lines = [
            {'account_id': entry.account_id, 'debit': entry.credit, 'credit': entry.debit}
            for entry in original.entries.all()
        ]
        if not lines:
            return None

        return AccountingService.create_journal_entry(
            date=date or timezone.now().date(),
            description=description or f"Void - {original.description}",
            lines=lines,
            transaction_type=original.transaction_type,
            reference=rev_ref,
        )

    @staticmethod
    @transaction.atomic
    def void_source_document_journals(base_reference, date=None, description=None):
        """Void the original entry and every adjustment posted for one source document."""
        from django.db.models import Q

        transactions = (
            Transaction.objects.filter(
                Q(reference=base_reference) | Q(reference__startswith=f"{base_reference}-")
            )
            .exclude(reference__endswith='-VOID')
            .order_by('id')
        )

        reversed_any = []
        for txn in transactions:
            if Transaction.objects.filter(reference=f"{txn.reference}-VOID").exists():
                continue
            reversed_txn = AccountingService.reverse_journal_by_reference(
                txn.reference,
                date=date,
                description=description or f"Void - {txn.description}",
            )
            if reversed_txn:
                reversed_any.append(reversed_txn)
        return reversed_any

    @staticmethod
    @transaction.atomic
    def record_payroll_reversal(employee_name, amount, date, reference=None, currency='AFN'):
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        salary_account = Account.objects.filter(code=f'5000_{currency}').first()
        if not cash_account or not salary_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        return AccountingService.create_journal_entry(
            date=date,
            description=f"Salary Payment Reversal - {employee_name}",
            lines=[
                {'account_id': salary_account.id, 'debit': 0, 'credit': amount},
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
            ],
            transaction_type='payroll',
            reference=reference,
        )

    @staticmethod
    @transaction.atomic
    def record_advance_reversal(employee_name, amount, date, reference=None, currency='AFN'):
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        advance_account = Account.objects.filter(code=f'1210_{currency}').first()
        if not cash_account or not advance_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        return AccountingService.create_journal_entry(
            date=date,
            description=f"Advance Payment Reversal - {employee_name}",
            lines=[
                {'account_id': advance_account.id, 'debit': 0, 'credit': amount},
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
            ],
            transaction_type='advance',
            reference=reference,
        )

    @staticmethod
    @transaction.atomic
    def record_expense_journal(expense, reference=None):
        currency = expense.currency or 'AFN'
        expense_account = AccountingService._expense_account_for_category(expense.category, currency)
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        if not cash_account or not expense_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        category_name = expense.category.name if expense.category else 'Expense'
        return AccountingService.create_journal_entry(
            date=expense.expense_date,
            description=f"Expense - {category_name}: {expense.description or ''}",
            lines=[
                {'account_id': expense_account.id, 'debit': expense.amount, 'credit': 0},
                {'account_id': cash_account.id, 'debit': 0, 'credit': expense.amount},
            ],
            transaction_type='expense',
            reference=reference or f"EXPENSE-{expense.id}",
        )

    @staticmethod
    @transaction.atomic
    def record_expense_reversal(expense, amount, date=None, reference=None):
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        currency = expense.currency or 'AFN'
        expense_account = AccountingService._expense_account_for_category(expense.category, currency)
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        if not cash_account or not expense_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        category_name = expense.category.name if expense.category else 'Expense'
        return AccountingService.create_journal_entry(
            date=date or expense.expense_date,
            description=f"Expense Reversal - {category_name}: {expense.description or ''}",
            lines=[
                {'account_id': expense_account.id, 'debit': 0, 'credit': amount},
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
            ],
            transaction_type='expense',
            reference=reference,
        )

    @staticmethod
    @transaction.atomic
    def record_other_income_journal(other_income, reference=None):
        currency = other_income.currency or 'AFN'
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        income_account = Account.objects.filter(code=f'4300_{currency}').first()
        if not cash_account or not income_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        category_name = (
            other_income.income_category.name
            if other_income.income_category else 'General'
        )
        return AccountingService.create_journal_entry(
            date=other_income.income_date,
            description=f"Other Income - {category_name} - {other_income.source or 'N/A'}",
            lines=[
                {'account_id': cash_account.id, 'debit': other_income.amount, 'credit': 0},
                {'account_id': income_account.id, 'debit': 0, 'credit': other_income.amount},
            ],
            transaction_type='other_income',
            reference=reference or f"INCOME-{other_income.id}",
        )

    @staticmethod
    @transaction.atomic
    def record_expense_adjustment(expense, amount, reference=None):
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        currency = expense.currency or 'AFN'
        expense_account = AccountingService._expense_account_for_category(expense.category, currency)
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        if not cash_account or not expense_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        category_name = expense.category.name if expense.category else 'Expense'
        return AccountingService.create_journal_entry(
            date=expense.expense_date,
            description=f"Expense Adjustment - {category_name}: {expense.description or ''}",
            lines=[
                {'account_id': expense_account.id, 'debit': amount, 'credit': 0},
                {'account_id': cash_account.id, 'debit': 0, 'credit': amount},
            ],
            transaction_type='expense',
            reference=reference,
        )

    @staticmethod
    @transaction.atomic
    def record_other_income_adjustment(other_income, amount, reference=None):
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        currency = other_income.currency or 'AFN'
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        income_account = Account.objects.filter(code=f'4300_{currency}').first()
        if not cash_account or not income_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        category_name = (
            other_income.income_category.name
            if other_income.income_category else 'General'
        )
        return AccountingService.create_journal_entry(
            date=other_income.income_date,
            description=f"Other Income Adjustment - {category_name} - {other_income.source or 'N/A'}",
            lines=[
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
                {'account_id': income_account.id, 'debit': 0, 'credit': amount},
            ],
            transaction_type='other_income',
            reference=reference,
        )

    @staticmethod
    @transaction.atomic
    def record_other_income_reversal(other_income, amount, date=None, reference=None):
        amount = Decimal(str(amount))
        if amount <= 0:
            return None

        currency = other_income.currency or 'AFN'
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        income_account = Account.objects.filter(code=f'4300_{currency}').first()
        if not cash_account or not income_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")

        category_name = (
            other_income.income_category.name
            if other_income.income_category else 'General'
        )
        return AccountingService.create_journal_entry(
            date=date or other_income.income_date,
            description=f"Other Income Reversal - {category_name} - {other_income.source or 'N/A'}",
            lines=[
                {'account_id': cash_account.id, 'debit': 0, 'credit': amount},
                {'account_id': income_account.id, 'debit': amount, 'credit': 0},
            ],
            transaction_type='other_income',
            reference=reference,
        )

    @staticmethod
    def ensure_payroll_journal(payroll):
        if payroll.is_deleted:
            return None

        reference = f"PAYROLL-{payroll.id}"
        if Transaction.objects.filter(reference=reference).exists():
            return None

        return AccountingService.record_payroll(
            employee_name=payroll.employee.full_name,
            amount=payroll.salary,
            date=payroll.payment_date,
            reference=reference,
            currency=payroll.currency or 'AFN',
        )

    @staticmethod
    def ensure_expense_journal(expense):
        if expense.is_deleted:
            return None

        reference = f"EXPENSE-{expense.id}"
        if Transaction.objects.filter(reference=reference).exists():
            return None

        return AccountingService.record_expense_journal(expense, reference=reference)

    @staticmethod
    def ensure_other_income_journal(other_income):
        if other_income.is_deleted:
            return None

        reference = f"INCOME-{other_income.id}"
        if Transaction.objects.filter(reference=reference).exists():
            return None

        return AccountingService.record_other_income_journal(other_income, reference=reference)
    
    @staticmethod
    @transaction.atomic
    def record_rental_accrual(rental_id, period_months, period_year, amount, currency='AFN'):
        """
        Record rental income accrual for specific month(s).
        This recognizes the income when rent is due, not when it's paid.
        
        Dr Rental Receivable
        Cr Rental Income
        
        Args:
            rental_id: ShopRental ID
            period_months: List of month strings ['01', '02', etc.]
            period_year: Year string
            amount: Monthly rent amount
            currency: Currency code
        
        Returns:
            Transaction object or None if already accrued
        """
        from api.models.data.shop_rental import ShopRental
        
        rental = ShopRental.objects.get(id=rental_id)
        
        # Check if accrual already exists for these months
        reference = f"RENTAL-ACCRUAL-{rental_id}-{period_year}-{'-'.join(period_months)}"
        existing = Transaction.objects.filter(reference=reference).exists()
        if existing:
            return None  # Already accrued
        
        rental_receivable_account = Account.objects.filter(code=f'1220_{currency}').first()
        rental_income_account = Account.objects.filter(code=f'4100_{currency}').first()
        
        if not rental_receivable_account or not rental_income_account:
            raise ValueError(f"Rental accounts not configured for {currency}. Please run init_chart_of_accounts.")
        
        # Calculate total amount for all months
        total_amount = Decimal(str(amount)) * len(period_months)
        
        months_str = ', '.join(period_months)
        description = f"Rental Accrual - {rental.shop.shop_number} - {rental.tenant.full_name} - {period_year}/{months_str}"
        
        return AccountingService.create_journal_entry(
            date=timezone.now().date(),
            description=description,
            lines=[
                {'account_id': rental_receivable_account.id, 'debit': total_amount, 'credit': 0},
                {'account_id': rental_income_account.id, 'debit': 0, 'credit': total_amount}
            ],
            transaction_type='rental_income',
            reference=reference
        )
    
    @staticmethod
    @transaction.atomic
    def record_rental_payment_with_accrual(rental_id, tenant_name, amount, date, period_months, period_year, currency='AFN', reference=None):
        """
        Record rental payment with automatic accrual.
        
        This method:
        1. Checks if accrual exists for the months being paid
        2. Creates accrual entries if not (Dr Receivable, Cr Income)
        3. Records the payment (Dr Cash, Cr Receivable)
        
        Args:
            rental_id: ShopRental ID
            tenant_name: Tenant's full name
            amount: Payment amount
            date: Payment date
            period_months: List of month strings ['01', '02', etc.]
            period_year: Year string
            currency: Currency code
            reference: Optional reference number
        
        Returns:
            List of Transaction objects created
        """
        from api.models.data.shop_rental import ShopRental
        
        rental = ShopRental.objects.get(id=rental_id)
        monthly_rent = rental.monthly_rent
        
        transactions = []
        
        # Step 1: Create accrual for any months that don't have one
        accrual_reference = f"RENTAL-ACCRUAL-{rental_id}-{period_year}-{'-'.join(period_months)}"
        if not Transaction.objects.filter(reference=accrual_reference).exists():
            accrual_txn = AccountingService.record_rental_accrual(
                rental_id=rental_id,
                period_months=period_months,
                period_year=period_year,
                amount=monthly_rent,
                currency=currency
            )
            if accrual_txn:
                transactions.append(accrual_txn)
        
        # Step 2: Record the payment (Dr Cash, Cr Rental Receivable)
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        rental_receivable_account = Account.objects.filter(code=f'1220_{currency}').first()
        
        if not cash_account or not rental_receivable_account:
            raise ValueError(f"Accounts not configured for {currency}. Please run init_chart_of_accounts.")
        
        months_str = ', '.join(period_months)
        payment_description = f"Rental Payment - {tenant_name} - {rental.shop.shop_number} - {period_year}/{months_str}"
        
        payment_txn = AccountingService.create_journal_entry(
            date=date,
            description=payment_description,
            lines=[
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
                {'account_id': rental_receivable_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='rental_income',
            reference=reference
        )
        transactions.append(payment_txn)
        
        return transactions
    
    @staticmethod
    @transaction.atomic
    def record_rental_income(tenant_name, amount, date, reference=None):
        """Record rental income"""
        from api.models.data.shop_rental import ShopRental
        
        # Get the most recent rental to determine currency
        last_rental = ShopRental.objects.filter(tenant__full_name__icontains=tenant_name).first()
        currency = last_rental.currency if last_rental else 'AFN'
        
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        rental_income_account = Account.objects.filter(code=f'4100_{currency}').first()
        
        if not cash_account or not rental_income_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")
        
        return AccountingService.create_journal_entry(
            date=date,
            description=f"Rental Income - {tenant_name}",
            lines=[
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
                {'account_id': rental_income_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='rental_income',
            reference=reference
        )
    
    @staticmethod
    @transaction.atomic
    def record_rental_payment(tenant_name, amount, date, reference=None, rental_id=None):
        """Record rental payment (when tenant actually pays)"""
        from api.models.data.shop_rental import ShopRental
        
        # Get the rental to determine currency
        rental = ShopRental.objects.get(id=rental_id) if rental_id else None
        currency = rental.currency if rental else 'AFN'
        
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        rental_income_account = Account.objects.filter(code=f'4100_{currency}').first()
        
        if not cash_account or not rental_income_account:
            raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")
        
        description = f"Rental Payment - {tenant_name}"
        if rental_id:
            description += f" (Rental #{rental_id})"
        
        return AccountingService.create_journal_entry(
            date=date,
            description=description,
            lines=[
                {'account_id': cash_account.id, 'debit': amount, 'credit': 0},
                {'account_id': rental_income_account.id, 'debit': 0, 'credit': amount}
            ],
            transaction_type='rental_income',
            reference=reference
        )
    
    @staticmethod
    def get_trial_balance(as_of_date=None):
        """Generate trial balance report with multi-currency support"""
        trial_balance = {currency: {'accounts': [], 'total_debit': Decimal('0'), 'total_credit': Decimal('0')} 
                        for currency in AccountingService.CURRENCIES}
        
        for currency in AccountingService.CURRENCIES:
            accounts = Account.objects.filter(is_active=True, is_detail=True, code__endswith=f'_{currency}')
            
            for account in accounts:
                # Get balance with date filter
                balance = AccountingService._get_account_balance(account, as_of_date=as_of_date)
                if balance != 0:
                    # For trial balance, we show the balance in debit/credit columns
                    # based on the normal balance of the account type
                    if account.account_type in ['asset', 'expense']:
                        # Normal balance is debit
                        if balance > 0:
                            debit = balance
                            credit = Decimal('0')
                        else:
                            debit = Decimal('0')
                            credit = abs(balance)
                    else:
                        # Liability/Equity/Income - normal balance is credit
                        if balance > 0:
                            credit = balance
                            debit = Decimal('0')
                        else:
                            credit = Decimal('0')
                            debit = abs(balance)
                    
                    trial_balance[currency]['accounts'].append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.get_account_type_display(),
                        'currency': currency,
                        'debit': float(debit),
                        'credit': float(credit)
                    })
                    
                    trial_balance[currency]['total_debit'] += debit
                    trial_balance[currency]['total_credit'] += credit

            trial_balance[currency]['is_balanced'] = abs(
                trial_balance[currency]['total_debit'] - trial_balance[currency]['total_credit']
            ) < Decimal('0.01')
        
        # Calculate grand totals (informational only — do not mix currencies for balance checks)
        grand_debit = sum(tb['total_debit'] for tb in trial_balance.values())
        grand_credit = sum(tb['total_credit'] for tb in trial_balance.values())
        per_currency_balanced = all(tb.get('is_balanced', True) for tb in trial_balance.values())
        
        return {
            'date': as_of_date or timezone.now().date(),
            'by_currency': trial_balance,
            'grand_total_debit': float(grand_debit),
            'grand_total_credit': float(grand_credit),
            'is_balanced': per_currency_balanced,
            'grand_totals_note': 'Grand totals sum AFN and USD without exchange conversion. Use per-currency totals.',
        }
    
    @staticmethod
    def _student_fees_collected(currency, start_date, end_date):
        """Sum completed student payments for a currency in a date range."""
        from django.db.models import Sum
        from api.models.data.student_finance import StudentPayment
        from api.utils.currency import normalize_currency

        currency = normalize_currency(currency)
        payments = StudentPayment.completed().filter(currency=currency)
        if start_date:
            payments = payments.filter(payment_date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__lte=end_date)
        total = payments.aggregate(total=Sum('amount'))['total']
        return Decimal(str(total or 0))

    @staticmethod
    def get_income_statement(start_date, end_date):
        """Generate income statement (Profit & Loss) with multi-currency support"""
        result = {
            'start_date': start_date,
            'end_date': end_date,
            'by_currency': {},
            'grand_total_income': Decimal('0'),
            'grand_total_expenses': Decimal('0'),
            'grand_net_income': Decimal('0')
        }
        
        for currency in AccountingService.CURRENCIES:
            income_accounts = Account.objects.filter(
                account_type='income',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            expense_accounts = Account.objects.filter(
                account_type='expense',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            
            total_income = Decimal('0')
            income_items = []
            for account in income_accounts:
                # Use date range filter for income statement
                balance = AccountingService._get_account_balance(
                    account, start_date=start_date, end_date=end_date
                )
                if balance != 0:
                    income_items.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.get_account_type_display(),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_income += balance

            has_student_revenue = any(item['code'].startswith('4000_') for item in income_items)
            if not has_student_revenue:
                student_collected = AccountingService._student_fees_collected(
                    currency, start_date, end_date
                )
                if student_collected > 0:
                    income_items.append({
                        'code': f'4000_{currency}',
                        'name': 'Student Fees (Collected)',
                        'type': 'Income',
                        'currency': currency,
                        'amount': float(student_collected),
                    })
                    total_income += student_collected
            
            total_expenses = Decimal('0')
            expense_items = []
            for account in expense_accounts:
                # Use date range filter for income statement
                balance = AccountingService._get_account_balance(
                    account, start_date=start_date, end_date=end_date
                )
                if balance != 0:
                    expense_items.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.get_account_type_display(),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_expenses += balance
            
            net_income = total_income - total_expenses
            
            result['by_currency'][currency] = {
                'income': income_items,
                'total_income': float(total_income),
                'expenses': expense_items,
                'total_expenses': float(total_expenses),
                'net_income': float(net_income),
                'is_profit': net_income > 0,
            }
            
            result['grand_total_income'] += total_income
            result['grand_total_expenses'] += total_expenses
        
        result['grand_net_income'] = result['grand_total_income'] - result['grand_total_expenses']
        result['grand_totals_note'] = 'Grand totals sum AFN and USD without exchange conversion. Use per-currency totals.'
        
        return result
    
    @staticmethod
    def get_balance_sheet(as_of_date=None):
        """Generate balance sheet with multi-currency support"""
        result = {
            'date': as_of_date or timezone.now().date(),
            'by_currency': {},
            'grand_total_assets': Decimal('0'),
            'grand_total_liabilities': Decimal('0'),
            'grand_total_equity': Decimal('0'),
            'grand_total_liabilities_and_equity': Decimal('0')
        }
        
        for currency in AccountingService.CURRENCIES:
            asset_accounts = Account.objects.filter(
                account_type='asset',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            liability_accounts = Account.objects.filter(
                account_type='liability',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            equity_accounts = Account.objects.filter(
                account_type='equity',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            
            total_assets = Decimal('0')
            assets = []
            for account in asset_accounts:
                # Use as_of_date filter
                balance = AccountingService._get_account_balance(account, as_of_date=as_of_date)
                if balance != 0:
                    assets.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.get_account_type_display(),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_assets += balance
            
            total_liabilities = Decimal('0')
            liabilities = []
            for account in liability_accounts:
                balance = AccountingService._get_account_balance(account, as_of_date=as_of_date)
                if balance != 0:
                    liabilities.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.get_account_type_display(),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_liabilities += balance
            
            total_equity = Decimal('0')
            equity = []
            for account in equity_accounts:
                balance = AccountingService._get_account_balance(account, as_of_date=as_of_date)
                if balance != 0:
                    equity.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.get_account_type_display(),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_equity += balance
            
            # Calculate retained earnings (net income from income accounts)
            # For balance sheet, we need to add net income to equity
            income_accounts = Account.objects.filter(
                account_type='income',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            expense_accounts = Account.objects.filter(
                account_type='expense',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            
            total_income = Decimal('0')
            for acc in income_accounts:
                total_income += AccountingService._get_account_balance(acc, as_of_date=as_of_date)
            
            total_expenses = Decimal('0')
            for acc in expense_accounts:
                total_expenses += AccountingService._get_account_balance(acc, as_of_date=as_of_date)
            
            retained_earnings = total_income - total_expenses
            if retained_earnings != 0:
                equity.append({
                    'code': 'RE',
                    'name': 'Retained Earnings',
                    'type': 'Equity',
                    'currency': currency,
                    'amount': float(retained_earnings)
                })
                total_equity += retained_earnings
            
            result['by_currency'][currency] = {
                'assets': assets,
                'total_assets': float(total_assets),
                'liabilities': liabilities,
                'total_liabilities': float(total_liabilities),
                'equity': equity,
                'total_equity': float(total_equity),
                'total_liabilities_and_equity': float(total_liabilities + total_equity),
                'is_balanced': abs(total_assets - (total_liabilities + total_equity)) < Decimal('0.01'),
            }
            
            result['grand_total_assets'] += total_assets
            result['grand_total_liabilities'] += total_liabilities
            result['grand_total_equity'] += total_equity
        
        result['grand_total_liabilities_and_equity'] = result['grand_total_liabilities'] + result['grand_total_equity']
        result['is_balanced'] = all(
            cur.get('is_balanced', True) for cur in result['by_currency'].values()
        )
        result['grand_totals_note'] = 'Grand totals sum AFN and USD without exchange conversion. Use per-currency totals.'
        
        return result
