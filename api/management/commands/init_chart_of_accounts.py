from django.core.management.base import BaseCommand
from django.db import transaction
from api.models.data.accounting import Account, FiscalYear, AccountType
from api.models.data.choices import CURRENCY_CHOICES
from datetime import date


class Command(BaseCommand):
    help = 'Initialize the Chart of Accounts with standard accounts for AFN and USD currencies'
    
    def handle(self, *args, **options):
        self.stdout.write('Initializing Chart of Accounts for AFN and USD...')
        
        with transaction.atomic():
            # Create Chart of Accounts for AFN
            self._create_accounts('AFN')
            
            # Create Chart of Accounts for USD
            self._create_accounts('USD')
            
            # Create current fiscal year
            self._create_fiscal_year()
        
        self.stdout.write(
            self.style.SUCCESS('Chart of Accounts initialized successfully for AFN and USD')
        )
    
    def _create_accounts(self, currency):
        """Create standard chart of accounts for specific currency"""
        currency_name = dict(CURRENCY_CHOICES).get(currency, currency)
        self.stdout.write(f'\nCreating accounts for {currency} ({currency_name})...')
        
        accounts_data = [
            # Assets (1xxx)
            {'name': f'Cash - {currency}', 'code': f'1000_{currency}', 'account_type': AccountType.ASSET, 'is_detail': True, 'currency': currency},
            {'name': f'Accounts Receivable - {currency}', 'code': f'1200_{currency}', 'account_type': AccountType.ASSET, 'is_detail': True, 'currency': currency},
            {'name': f'Employee Advances - {currency}', 'code': f'1210_{currency}', 'account_type': AccountType.ASSET, 'is_detail': True, 'currency': currency},
            {'name': f'Rental Receivable - {currency}', 'code': f'1220_{currency}', 'account_type': AccountType.ASSET, 'is_detail': True, 'currency': currency},
            
            # Liabilities (2xxx)
            {'name': f'Accounts Payable - {currency}', 'code': f'2000_{currency}', 'account_type': AccountType.LIABILITY, 'is_detail': True, 'currency': currency},
            
            # Equity (3xxx)
            {'name': f"Owner's Capital - {currency}", 'code': f'3000_{currency}', 'account_type': AccountType.EQUITY, 'is_detail': True, 'currency': currency},
            
            # Income (4xxx)
            {'name': f'Student Fees Revenue - {currency}', 'code': f'4000_{currency}', 'account_type': AccountType.INCOME, 'is_detail': True, 'currency': currency},
            {'name': f'Rental Income - {currency}', 'code': f'4100_{currency}', 'account_type': AccountType.INCOME, 'is_detail': True, 'currency': currency},
            {'name': f'Other Income - {currency}', 'code': f'4300_{currency}', 'account_type': AccountType.INCOME, 'is_detail': True, 'currency': currency},
            
            # Expenses (5xxx)
            {'name': f'Salaries and Wages - {currency}', 'code': f'5000_{currency}', 'account_type': AccountType.EXPENSE, 'is_detail': True, 'currency': currency},
            {'name': f'Other Expenses - {currency}', 'code': f'5900_{currency}', 'account_type': AccountType.EXPENSE, 'is_detail': True, 'currency': currency},
        ]
        
        created_count = 0
        for acc_data in accounts_data:
            account, created = Account.objects.get_or_create(
                code=acc_data['code'],
                defaults=acc_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created: {account.code} - {account.name}')
        
        self.stdout.write(f'Created {created_count} accounts for {currency}')
    
    def _create_fiscal_year(self):
        """Create current fiscal year"""
        current_year = date.today().year
        
        fiscal_year, created = FiscalYear.objects.get_or_create(
            name=f'FY {current_year}',
            defaults={
                'start_date': date(current_year, 1, 1),
                'end_date': date(current_year, 12, 31),
                'is_closed': False
            }
        )
        
        if created:
            self.stdout.write(f'Created fiscal year: {fiscal_year.name}')
        else:
            self.stdout.write(f'Fiscal year already exists: {fiscal_year.name}')
