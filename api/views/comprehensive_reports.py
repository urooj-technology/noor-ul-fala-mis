from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from django.utils import timezone
from api.models.data.shop_rental import ShopRental
from api.services.accounting_service import AccountingService
from api.utils.excel_export import export_to_excel
from api.utils.pdf_export import export_to_pdf
from api.utils.calendar import shamsi_to_gregorian, qamari_to_gregorian, parse_shamsi_date, parse_qamari_date


class ComprehensiveReportView(APIView):
    """Comprehensive financial report with all income and expenses"""
    
    def get(self, request):
        report_type = request.query_params.get('type', 'summary')
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        export_format = request.query_params.get('export')  # 'pdf' or 'excel'
        calendar_type = request.query_params.get('calendar_type', 'gregorian')
        
        # Convert dates if using Shamsi or Qamari calendar
        if calendar_type in ['shamsi', 'qamari']:
            if start_date:
                if calendar_type == 'shamsi':
                    parsed = parse_shamsi_date(start_date)
                    if parsed:
                        greg_date = shamsi_to_gregorian(*parsed)
                        start_date = greg_date.isoformat() if greg_date else start_date
                elif calendar_type == 'qamari':
                    parsed = parse_qamari_date(start_date)
                    if parsed:
                        greg_date = qamari_to_gregorian(*parsed)
                        start_date = greg_date.isoformat() if greg_date else start_date
            if end_date:
                if calendar_type == 'shamsi':
                    parsed = parse_shamsi_date(end_date)
                    if parsed:
                        greg_date = shamsi_to_gregorian(*parsed)
                        end_date = greg_date.isoformat() if greg_date else end_date
                elif calendar_type == 'qamari':
                    parsed = parse_qamari_date(end_date)
                    if parsed:
                        greg_date = qamari_to_gregorian(*parsed)
                        end_date = greg_date.isoformat() if greg_date else end_date
        
        data = self._generate_report(report_type, period, start_date, end_date)
        
        if export_format == 'excel':
            return self._export_excel(data, report_type)
        elif export_format == 'pdf':
            return self._export_pdf(data, report_type)
        
        return Response(data, status=status.HTTP_200_OK)
    
    def _generate_report(self, report_type, period, start_date, end_date):
        if report_type == 'financial':
            return self._financial_report(period, start_date, end_date)
        elif report_type == 'student_payments':
            return self._student_payments_report(period, start_date, end_date)
        elif report_type == 'payroll':
            return self._payroll_report(period, start_date, end_date)
        elif report_type == 'rental':
            return self._rental_report(period, start_date, end_date)
        elif report_type == 'trial_balance':
            return self._trial_balance_report()
        elif report_type == 'income_statement':
            return self._income_statement_report(start_date, end_date)
        elif report_type == 'balance_sheet':
            return self._balance_sheet_report()
        else:
            return self._summary_report(period, start_date, end_date)
    
    def _get_date_range(self, period, start_date, end_date):
        """Get date range for reports"""
        today = timezone.now().date()
        
        if period == 'custom' and start_date and end_date:
            return {'start': start_date, 'end': end_date}
        elif period == 'daily':
            return {'start': today.isoformat(), 'end': today.isoformat()}
        elif period == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            return {'start': week_start.isoformat(), 'end': today.isoformat()}
        elif period == 'monthly':
            # Show all data
            return {'start': None, 'end': None}
        elif period == 'yearly':
            year_start = today.replace(month=1, day=1)
            return {'start': year_start.isoformat(), 'end': today.isoformat()}
        else:
            return {'start': None, 'end': None}
    
    def _summary_report(self, period, start_date, end_date):
        """Generate comprehensive summary report using accounting system"""
        # Get date range
        date_range = self._get_date_range(period, start_date, end_date)
        
        # Get income statement from accounting system
        income_statement = AccountingService.get_income_statement(
            date_range['start'], date_range['end']
        )
        
        # Process data by currency
        income_by_type = {'AFN': {}, 'USD': {}}
        expense_by_type = {'AFN': {}, 'USD': {}}
        total_income = {'AFN': 0, 'USD': 0}
        total_expenses = {'AFN': 0, 'USD': 0}
        
        for currency, data in income_statement.get('by_currency', {}).items():
            # Process income accounts
            for item in data.get('income', []):
                name = item['name']
                amount = item['amount']
                total_income[currency] += amount
                
                # Categorize income by type
                if 'student' in name.lower():
                    income_by_type[currency]['student'] = income_by_type[currency].get('student', 0) + amount
                elif 'rental' in name.lower():
                    income_by_type[currency]['rental'] = income_by_type[currency].get('rental', 0) + amount
                else:
                    income_by_type[currency]['other'] = income_by_type[currency].get('other', 0) + amount
            
            # Process expense accounts
            for item in data.get('expenses', []):
                name = item['name']
                amount = item['amount']
                total_expenses[currency] += amount
                
                # Categorize expense by type
                if 'salary' in name.lower():
                    expense_by_type[currency]['payroll'] = expense_by_type[currency].get('payroll', 0) + amount
                elif 'advance' in name.lower():
                    expense_by_type[currency]['advances'] = expense_by_type[currency].get('advances', 0) + amount
                else:
                    expense_by_type[currency]['general'] = expense_by_type[currency].get('general', 0) + amount
        
        # Calculate profit
        profit_afn = total_income['AFN'] - total_expenses['AFN']
        profit_usd = total_income['USD'] - total_expenses['USD']
        
        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'income': {
                'student': {'AFN': income_by_type['AFN'].get('student', 0), 'USD': income_by_type['USD'].get('student', 0)},
                'rental': {'AFN': income_by_type['AFN'].get('rental', 0), 'USD': income_by_type['USD'].get('rental', 0)},
                'other': {'AFN': income_by_type['AFN'].get('other', 0), 'USD': income_by_type['USD'].get('other', 0)},
                'total': total_income
            },
            'expenses': {
                'general': {'AFN': expense_by_type['AFN'].get('general', 0), 'USD': expense_by_type['USD'].get('general', 0)},
                'payroll': {'AFN': expense_by_type['AFN'].get('payroll', 0), 'USD': expense_by_type['USD'].get('payroll', 0)},
                'advances': {'AFN': expense_by_type['AFN'].get('advances', 0), 'USD': expense_by_type['USD'].get('advances', 0)},
                'total': total_expenses
            },
            'profit': {
                'AFN': profit_afn,
                'USD': profit_usd
            }
        }
    
    def _financial_report(self, period, start_date, end_date):
        """Detailed financial report with breakdowns using accounting system"""
        base_report = self._summary_report(period, start_date, end_date)
        
        # Get detailed income statement for breakdowns
        date_range = self._get_date_range(period, start_date, end_date)
        income_statement = AccountingService.get_income_statement(
            date_range['start'], date_range['end']
        )
        
        # Add detailed expense breakdown
        expense_breakdown = []
        for currency, data in income_statement.get('by_currency', {}).items():
            for item in data.get('expenses', []):
                expense_breakdown.append({
                    'name': item['name'],
                    'currency': item['currency'],
                    'amount': item['amount']
                })
        base_report['expense_breakdown'] = expense_breakdown
        
        # Add detailed income breakdown
        income_breakdown = []
        for currency, data in income_statement.get('by_currency', {}).items():
            for item in data.get('income', []):
                income_breakdown.append({
                    'name': item['name'],
                    'currency': item['currency'],
                    'amount': item['amount']
                })
        base_report['income_breakdown'] = income_breakdown
        
        return base_report
    
    def _student_payments_report(self, period, start_date, end_date):
        """Student payments detailed report using accounting system"""
        from api.models.data.accounting import Account, JournalEntry
        
        date_range = self._get_date_range(period, start_date, end_date)
        
        # Get student income from journal entries
        result = {'AFN': 0, 'USD': 0}
        by_currency = {'AFN': [], 'USD': []}
        
        for currency in ['AFN', 'USD']:
            # Find student income accounts
            accounts = Account.objects.filter(
                account_type='income',
                code__endswith=f'_{currency}',
                name__icontains='student'
            )
            
            for account in accounts:
                entries = JournalEntry.objects.filter(account=account)
                if date_range['start']:
                    entries = entries.filter(date__gte=date_range['start'])
                if date_range['end']:
                    entries = entries.filter(date__lte=date_range['end'])
                
                from django.db.models import Sum
                total = entries.aggregate(total=Sum('credit'))['total'] or 0
                result[currency] = float(total)
                
                # Get breakdown by transaction
                for entry in entries.filter(credit__gt=0).select_related('transaction'):
                    by_currency[currency].append({
                        'date': str(entry.date),
                        'description': entry.description,
                        'amount': float(entry.credit)
                    })
        
        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'total': result,
            'by_status': [],  # Not applicable from journal entries
            'by_payment_cycle': [],
            'payment_count': sum(len(v) for v in by_currency.values()),
            'details': by_currency
        }
    
    def _payroll_report(self, period, start_date, end_date):
        """Payroll detailed report using accounting system"""
        from api.models.data.accounting import Account, JournalEntry
        from django.db.models import Sum
        
        date_range = self._get_date_range(period, start_date, end_date)
        
        result = {
            'payroll': {'total': {'AFN': 0, 'USD': 0}, 'by_employee': []},
            'advances': {'total': {'AFN': 0, 'USD': 0}, 'by_employee': []}
        }
        
        for currency in ['AFN', 'USD']:
            # Salary expense accounts
            salary_accounts = Account.objects.filter(
                account_type='expense',
                code__endswith=f'_{currency}',
                name__icontains='salary'
            )
            
            for account in salary_accounts:
                entries = JournalEntry.objects.filter(account=account)
                if date_range['start']:
                    entries = entries.filter(date__gte=date_range['start'])
                if date_range['end']:
                    entries = entries.filter(date__lte=date_range['end'])
                
                total = entries.aggregate(total=Sum('debit'))['total'] or 0
                result['payroll']['total'][currency] = float(total)
            
            # Advance accounts
            advance_accounts = Account.objects.filter(
                account_type='asset',
                code__endswith=f'_{currency}',
                name__icontains='advance'
            )
            
            for account in advance_accounts:
                entries = JournalEntry.objects.filter(account=account)
                if date_range['start']:
                    entries = entries.filter(date__gte=date_range['start'])
                if date_range['end']:
                    entries = entries.filter(date__lte=date_range['end'])
                
                total = entries.aggregate(total=Sum('debit'))['total'] or 0
                result['advances']['total'][currency] = float(total)
        
        result['period'] = period
        result['generated_at'] = timezone.now().isoformat()
        return result
    
    def _rental_report(self, period, start_date, end_date):
        """Rental income detailed report using accounting system"""
        from api.models.data.accounting import Account, JournalEntry
        from django.db.models import Sum
        
        today = timezone.now().date()
        date_range = self._get_date_range(period, start_date, end_date)
        
        result = {'AFN': 0, 'USD': 0}
        details = {'AFN': [], 'USD': []}
        
        for currency in ['AFN', 'USD']:
            # Rental income accounts
            accounts = Account.objects.filter(
                account_type='income',
                code__endswith=f'_{currency}',
                name__icontains='rental'
            )
            
            for account in accounts:
                entries = JournalEntry.objects.filter(account=account)
                if date_range['start']:
                    entries = entries.filter(date__gte=date_range['start'])
                if date_range['end']:
                    entries = entries.filter(date__lte=date_range['end'])
                
                total = entries.aggregate(total=Sum('credit'))['total'] or 0
                result[currency] = float(total)
        
        # Active rentals info (for reference)
        active_rentals = ShopRental.objects.filter(
            rental_status='active',
            start_date__lte=today,
            end_date__gte=today
        ).count()
        
        expiring_soon = ShopRental.objects.filter(
            rental_status='active',
            end_date__lte=today + timedelta(days=30),
            end_date__gte=today
        ).count()
        
        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'total_received': result,
            'payment_count': 0,  # Not tracked in journal entries
            'active_rentals': active_rentals,
            'by_shop': [],  # Would need additional tracking
            'expiring_within_30_days': expiring_soon
        }
    
    def _trial_balance_report(self):
        """Trial balance from accounting system with multi-currency support"""
        return AccountingService.get_trial_balance()
    
    def _income_statement_report(self, start_date, end_date):
        """Income statement (Profit & Loss) with multi-currency support"""
        today = timezone.now().date()
        start = start_date or today.replace(day=1).isoformat()
        end = end_date or today.isoformat()
        return AccountingService.get_income_statement(start, end)
    
    def _balance_sheet_report(self):
        """Balance sheet with multi-currency support"""
        return AccountingService.get_balance_sheet()
    
    def _export_excel(self, data, report_type):
        """Export report to Excel"""
        headers, rows = self._prepare_export_data(data, report_type)
        
        metadata = {
            'Report Type': report_type.replace('_', ' ').title(),
            'Generated': timezone.now().strftime('%Y-%m-%d %H:%M')
        }
        
        return export_to_excel(
            data=rows,
            headers=headers,
            filename=f'{report_type}_report_{timezone.now().strftime("%Y%m%d")}.xlsx',
            sheet_name=report_type.replace('_', ' ').title(),
            title=f'{report_type.replace("_", " ").title()} Report',
            metadata=metadata
        )
    
    def _export_pdf(self, data, report_type):
        """Export report to PDF"""
        headers, rows = self._prepare_export_data(data, report_type)
        
        metadata = {
            'Report Type': report_type.replace('_', ' ').title(),
            'Generated': timezone.now().strftime('%Y-%m-%d %H:%M')
        }
        
        return export_to_pdf(
            data=rows,
            headers=headers,
            filename=f'{report_type}_report_{timezone.now().strftime("%Y%m%d")}.pdf',
            title=f'{report_type.replace("_", " ").title()} Report',
            metadata=metadata
        )
    
    def _prepare_export_data(self, data, report_type):
        """Prepare data for export based on report type"""
        headers = []
        rows = []
        
        if report_type == 'summary':
            headers = ['Category', 'AFN', 'USD']
            rows = [
                ['Student Payments', data['income']['student']['AFN'], data['income']['student']['USD']],
                ['Rental Income', data['income']['rental']['AFN'], data['income']['rental']['USD']],
                ['Other Income', data['income']['other']['AFN'], data['income']['other']['USD']],
                ['Total Income', data['income']['total']['AFN'], data['income']['total']['USD']],
                ['', '', ''],
                ['General Expenses', data['expenses']['general']['AFN'], data['expenses']['general']['USD']],
                ['Payroll', data['expenses']['payroll']['AFN'], data['expenses']['payroll']['USD']],
                ['Advances', data['expenses']['advances']['AFN'], data['expenses']['advances']['USD']],
                ['Total Expenses', data['expenses']['total']['AFN'], data['expenses']['total']['USD']],
                ['', '', ''],
                ['Net Profit/Loss', data['profit']['AFN'], data['profit']['USD']],
            ]
        elif report_type == 'student_payments':
            headers = ['Status', 'Currency', 'Total Amount', 'Count']
            rows = [[item['payment_status'], item['currency'], float(item['total']), item['count']] 
                   for item in data.get('by_status', [])]
        elif report_type == 'payroll':
            headers = ['Employee', 'Currency', 'Total Salary']
            rows = [[item['employee__full_name'], item['currency'], float(item['total'])] 
                   for item in data.get('payroll', {}).get('by_employee', [])]
        elif report_type == 'trial_balance':
            headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit']
            rows = [[item['code'], item['name'], item['type'], item['debit'], item['credit']]
                   for item in data.get('accounts', [])]
        
        return headers, rows


class DailyReportView(APIView):
    """Daily financial report"""
    
    def get(self, request):
        date = request.query_params.get('date', timezone.now().date().isoformat())
        export_format = request.query_params.get('export')
        
        report = self._generate_daily_report(date)
        
        if export_format == 'excel':
            return self._export_excel(report, date)
        elif export_format == 'pdf':
            return self._export_pdf(report, date)
        
        return Response(report, status=status.HTTP_200_OK)
    
    def _generate_daily_report(self, date):
        """Generate daily report using accounting system"""
        from api.models.data.accounting import Account, JournalEntry
        from django.db.models import Sum
        
        try:
            report_date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            report_date = timezone.now().date()
        
        result = {
            'student_payments': {'total': {'AFN': 0, 'USD': 0}, 'count': 0},
            'expenses': {'total': {'AFN': 0, 'USD': 0}, 'count': 0},
            'other_income': {'total': {'AFN': 0, 'USD': 0}, 'count': 0},
            'payroll': {'total': {'AFN': 0, 'USD': 0}, 'count': 0}
        }
        
        for currency in ['AFN', 'USD']:
            # Student income
            student_accounts = Account.objects.filter(
                account_type='income', code__endswith=f'_{currency}', name__icontains='student'
            )
            for acc in student_accounts:
                entries = JournalEntry.objects.filter(account=acc, date=report_date)
                total = entries.aggregate(total=Sum('credit'))['total'] or 0
                result['student_payments']['total'][currency] = float(total)
                result['student_payments']['count'] += entries.count()
            
            # Rental income
            rental_accounts = Account.objects.filter(
                account_type='income', code__endswith=f'_{currency}', name__icontains='rental'
            )
            for acc in rental_accounts:
                entries = JournalEntry.objects.filter(account=acc, date=report_date)
                total = entries.aggregate(total=Sum('credit'))['total'] or 0
                result['other_income']['total'][currency] += float(total)
                result['other_income']['count'] += entries.count()
            
            # Other income (not student/rental)
            other_income_accounts = Account.objects.filter(
                account_type='income', code__endswith=f'_{currency}'
            ).exclude(name__icontains='student').exclude(name__icontains='rental')
            for acc in other_income_accounts:
                entries = JournalEntry.objects.filter(account=acc, date=report_date)
                total = entries.aggregate(total=Sum('credit'))['total'] or 0
                result['other_income']['total'][currency] += float(total)
                result['other_income']['count'] += entries.count()
            
            # Expenses (general)
            expense_accounts = Account.objects.filter(
                account_type='expense', code__endswith=f'_{currency}'
            ).exclude(name__icontains='salary')
            for acc in expense_accounts:
                entries = JournalEntry.objects.filter(account=acc, date=report_date)
                total = entries.aggregate(total=Sum('debit'))['total'] or 0
                result['expenses']['total'][currency] += float(total)
                result['expenses']['count'] += entries.count()
            
            # Salary/Payroll
            salary_accounts = Account.objects.filter(
                account_type='expense', code__endswith=f'_{currency}', name__icontains='salary'
            )
            for acc in salary_accounts:
                entries = JournalEntry.objects.filter(account=acc, date=report_date)
                total = entries.aggregate(total=Sum('debit'))['total'] or 0
                result['payroll']['total'][currency] += float(total)
                result['payroll']['count'] += entries.count()
        
        # Calculate net position
        result['net_position'] = {
            'AFN': (result['student_payments']['total']['AFN'] + 
                    result['other_income']['total']['AFN'] - 
                    result['expenses']['total']['AFN'] - 
                    result['payroll']['total']['AFN']),
            'USD': (result['student_payments']['total']['USD'] + 
                    result['other_income']['total']['USD'] - 
                    result['expenses']['total']['USD'] - 
                    result['payroll']['total']['USD'])
        }
        
        return {
            'date': date,
            'generated_at': timezone.now().isoformat(),
            **result
        }
    
    def _export_excel(self, report, date):
        headers = ['Category', 'AFN', 'USD', 'Count']
        rows = [
            ['Student Payments', report['student_payments']['total']['AFN'], 
             report['student_payments']['total']['USD'], report['student_payments']['count']],
            ['Other Income', report['other_income']['total']['AFN'], 
             report['other_income']['total']['USD'], report['other_income']['count']],
            ['Expenses', report['expenses']['total']['AFN'], 
             report['expenses']['total']['USD'], report['expenses']['count']],
            ['Payroll', report['payroll']['total']['AFN'], 
             report['payroll']['total']['USD'], report['payroll']['count']],
            ['', '', '', ''],
            ['Net Position', report['net_position']['AFN'], report['net_position']['USD'], ''],
        ]
        
        return export_to_excel(
            data=rows,
            headers=headers,
            filename=f'daily_report_{date}.xlsx',
            sheet_name='Daily Report',
            title=f'Daily Report - {date}',
            metadata={'Date': date}
        )
    
    def _export_pdf(self, report, date):
        headers = ['Category', 'AFN', 'USD', 'Count']
        rows = [
            ['Student Payments', report['student_payments']['total']['AFN'], 
             report['student_payments']['total']['USD'], report['student_payments']['count']],
            ['Other Income', report['other_income']['total']['AFN'], 
             report['other_income']['total']['USD'], report['other_income']['count']],
            ['Expenses', report['expenses']['total']['AFN'], 
             report['expenses']['total']['USD'], report['expenses']['count']],
            ['Payroll', report['payroll']['total']['AFN'], 
             report['payroll']['total']['USD'], report['payroll']['count']],
        ]
        
        return export_to_pdf(
            data=rows,
            headers=headers,
            filename=f'daily_report_{date}.pdf',
            title=f'Daily Report - {date}',
            metadata={'Date': date}
        )