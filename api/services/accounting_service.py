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
    def _get_account_balance(account):
        """Calculate account balance from journal entries"""
        from django.db.models import Sum
        debits = account.journal_entries.aggregate(total=Sum('debit'))['total'] or Decimal('0')
        credits = account.journal_entries.aggregate(total=Sum('credit'))['total'] or Decimal('0')
        
        # Asset/Expense: Debit increases, Credit decreases
        if account.category.account_type in ['asset', 'expense']:
            return debits - credits
        # Liability/Equity/Income: Credit increases, Debit decreases
        return credits - debits
    
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
    def record_expense(amount, date, description, expense_category, reference=None, currency='AFN'):
        """Record an expense as a journal entry"""
        cash_account = Account.objects.filter(code=f'1000_{currency}').first()
        expense_account = Account.objects.filter(code=f'5000_{currency}').first()
        
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
    def record_payroll(employee_name, amount, date, reference=None):
        """Record payroll payment"""
        from api.models.data.payroll import Payroll
        
        # Get the most recent payroll to determine currency
        last_payroll = Payroll.objects.filter(employee__full_name__icontains=employee_name).first()
        currency = last_payroll.currency if last_payroll else 'AFN'
        
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
    def record_advance(employee_name, amount, date, reference=None):
        """Record advance payment"""
        from api.models.data.advance import Advance
        
        # Get the most recent advance to determine currency
        last_advance = Advance.objects.filter(employee__full_name__icontains=employee_name).first()
        currency = last_advance.currency if last_advance else 'AFN'
        
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
                balance = AccountingService._get_account_balance(account)
                if balance != 0:
                    # Normalize balance for display
                    if account.category.account_type in ['asset', 'expense']:
                        debit = balance if balance > 0 else Decimal('0')
                        credit = abs(balance) if balance < 0 else Decimal('0')
                    else:  # liability, equity, income
                        credit = balance if balance > 0 else Decimal('0')
                        debit = abs(balance) if balance < 0 else Decimal('0')
                    
                    trial_balance[currency]['accounts'].append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'type': account.category.get_account_type_display(),
                        'currency': currency,
                        'debit': float(debit),
                        'credit': float(credit)
                    })
                    
                    trial_balance[currency]['total_debit'] += debit
                    trial_balance[currency]['total_credit'] += credit
        
        # Calculate grand totals
        grand_debit = sum(tb['total_debit'] for tb in trial_balance.values())
        grand_credit = sum(tb['total_credit'] for tb in trial_balance.values())
        
        return {
            'date': as_of_date or timezone.now().date(),
            'by_currency': trial_balance,
            'grand_total_debit': float(grand_debit),
            'grand_total_credit': float(grand_credit),
            'is_balanced': abs(grand_debit - grand_credit) < Decimal('0.01')
        }
    
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
                category__account_type='income',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            expense_accounts = Account.objects.filter(
                category__account_type='expense',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            
            total_income = Decimal('0')
            income_items = []
            for account in income_accounts:
                balance = AccountingService._get_account_balance(account)
                if balance != 0:
                    income_items.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_income += balance
            
            total_expenses = Decimal('0')
            expense_items = []
            for account in expense_accounts:
                balance = AccountingService._get_account_balance(account)
                if balance != 0:
                    expense_items.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
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
                'is_profit': net_income > 0
            }
            
            result['grand_total_income'] += total_income
            result['grand_total_expenses'] += total_expenses
        
        result['grand_net_income'] = result['grand_total_income'] - result['grand_total_expenses']
        
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
                category__account_type='asset',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            liability_accounts = Account.objects.filter(
                category__account_type='liability',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            equity_accounts = Account.objects.filter(
                category__account_type='equity',
                is_active=True,
                code__endswith=f'_{currency}'
            )
            
            total_assets = Decimal('0')
            assets = []
            for account in asset_accounts:
                balance = AccountingService._get_account_balance(account)
                if balance != 0:
                    assets.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_assets += balance
            
            total_liabilities = Decimal('0')
            liabilities = []
            for account in liability_accounts:
                balance = AccountingService._get_account_balance(account)
                if balance != 0:
                    liabilities.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_liabilities += balance
            
            total_equity = Decimal('0')
            equity = []
            for account in equity_accounts:
                balance = AccountingService._get_account_balance(account)
                if balance != 0:
                    equity.append({
                        'code': account.code,
                        'name': account.name.replace(f' - {currency}', ''),
                        'currency': currency,
                        'amount': float(balance)
                    })
                    total_equity += balance
            
            result['by_currency'][currency] = {
                'assets': assets,
                'total_assets': float(total_assets),
                'liabilities': liabilities,
                'total_liabilities': float(total_liabilities),
                'equity': equity,
                'total_equity': float(total_equity),
                'total_liabilities_and_equity': float(total_liabilities + total_equity)
            }
            
            result['grand_total_assets'] += total_assets
            result['grand_total_liabilities'] += total_liabilities
            result['grand_total_equity'] += total_equity
        
        result['grand_total_liabilities_and_equity'] = result['grand_total_liabilities'] + result['grand_total_equity']
        result['is_balanced'] = abs(result['grand_total_assets'] - result['grand_total_liabilities_and_equity']) < Decimal('0.01')
        
        return result
