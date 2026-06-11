from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from datetime import datetime, timedelta
from django.utils import timezone
from api.models.data.expenses import Expense
from api.models.data.payroll import Payroll
from api.models.data.advance import Advance
from api.models.data.student_finance import StudentPayment
from api.models.data.shop_rental import ShopRental
from api.models.data.other_income import OtherIncome
from api.services.accounting_service import AccountingService
from api.utils.excel_export import export_to_excel
from api.utils.pdf_export import export_to_pdf


class ComprehensiveReportView(APIView):
    """Comprehensive financial report with all income and expenses"""
    
    def get(self, request):
        report_type = request.query_params.get('type', 'summary')
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        export_format = request.query_params.get('export')  # 'pdf' or 'excel'
        
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
    
    def _get_date_filter(self, period, start_date, end_date, date_field='date'):
        today = timezone.now().date()
        
        if period == 'custom' and start_date and end_date:
            return {
                f'{date_field}__gte': datetime.strptime(start_date, '%Y-%m-%d').date(),
                f'{date_field}__lte': datetime.strptime(end_date, '%Y-%m-%d').date()
            }
        elif period == 'daily':
            return {date_field: today}
        elif period == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            return {f'{date_field}__gte': week_start, f'{date_field}__lte': today}
        elif period == 'monthly':
            month_start = today.replace(day=1)
            return {f'{date_field}__gte': month_start, f'{date_field}__lte': today}
        elif period == 'yearly':
            year_start = today.replace(month=1, day=1)
            return {f'{date_field}__gte': year_start, f'{date_field}__lte': today}
        return {}
    
    def _summary_report(self, period, start_date, end_date):
        """Generate comprehensive summary report"""
        payment_filter = self._get_date_filter(period, start_date, end_date, 'payment_date')
        expense_filter = self._get_date_filter(period, start_date, end_date, 'expense_date')
        income_filter = self._get_date_filter(period, start_date, end_date, 'income_date')
        
        # Student Payments
        student_payments = StudentPayment.objects.filter(**payment_filter)
        student_income_afn = student_payments.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        student_income_usd = student_payments.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Rental Income
        rentals = ShopRental.objects.filter(start_date__lte=timezone.now().date())
        rental_income_afn = rentals.filter(currency='AFN').aggregate(total=Sum('monthly_rent'))['total'] or 0
        rental_income_usd = rentals.filter(currency='USD').aggregate(total=Sum('monthly_rent'))['total'] or 0
        
        # Other Income
        other_incomes = OtherIncome.objects.filter(**income_filter)
        other_income_afn = other_incomes.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        other_income_usd = other_incomes.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Total Income
        total_income_afn = float(student_income_afn) + float(rental_income_afn) + float(other_income_afn)
        total_income_usd = float(student_income_usd) + float(rental_income_usd) + float(other_income_usd)
        
        # Expenses
        expenses = Expense.objects.filter(**expense_filter)
        expense_afn = expenses.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        expense_usd = expenses.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Payroll
        payrolls = Payroll.objects.filter(**payment_filter)
        payroll_afn = payrolls.filter(currency='AFN').aggregate(total=Sum('salary'))['total'] or 0
        payroll_usd = payrolls.filter(currency='USD').aggregate(total=Sum('salary'))['total'] or 0
        
        # Advances
        advances = Advance.objects.filter(**payment_filter)
        advance_afn = advances.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        advance_usd = advances.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Total Expenses
        total_expense_afn = float(expense_afn) + float(payroll_afn) + float(advance_afn)
        total_expense_usd = float(expense_usd) + float(payroll_usd) + float(advance_usd)
        
        # Profit
        profit_afn = total_income_afn - total_expense_afn
        profit_usd = total_income_usd - total_expense_usd
        
        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'income': {
                'student': {'AFN': float(student_income_afn), 'USD': float(student_income_usd)},
                'rental': {'AFN': float(rental_income_afn), 'USD': float(rental_income_usd)},
                'other': {'AFN': float(other_income_afn), 'USD': float(other_income_usd)},
                'total': {'AFN': total_income_afn, 'USD': total_income_usd}
            },
            'expenses': {
                'general': {'AFN': float(expense_afn), 'USD': float(expense_usd)},
                'payroll': {'AFN': float(payroll_afn), 'USD': float(payroll_usd)},
                'advances': {'AFN': float(advance_afn), 'USD': float(advance_usd)},
                'total': {'AFN': total_expense_afn, 'USD': total_expense_usd}
            },
            'profit': {
                'AFN': profit_afn,
                'USD': profit_usd
            }
        }
    
    def _financial_report(self, period, start_date, end_date):
        """Detailed financial report with breakdowns"""
        base_report = self._summary_report(period, start_date, end_date)
        
        # Add expense breakdown by category
        expense_filter = self._get_date_filter(period, start_date, end_date, 'expense_date')
        expense_by_category = Expense.objects.filter(**expense_filter).values(
            'category__name', 'currency'
        ).annotate(total=Sum('amount'))
        
        base_report['expense_breakdown'] = list(expense_by_category)
        
        # Add income by category
        income_filter = self._get_date_filter(period, start_date, end_date, 'income_date')
        income_by_category = OtherIncome.objects.filter(**income_filter).values(
            'income_category__name', 'currency'
        ).annotate(total=Sum('amount'))
        
        base_report['other_income_breakdown'] = list(income_by_category)
        
        return base_report
    
    def _student_payments_report(self, period, start_date, end_date):
        """Student payments detailed report"""
        payment_filter = self._get_date_filter(period, start_date, end_date, 'payment_date')
        
        payments = StudentPayment.objects.filter(**payment_filter).select_related('student')

        total_afn = payments.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        total_usd = payments.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0

        by_status = payments.values('payment_status', 'currency').annotate(
            total=Sum('amount'),
            count=Count('id')
        )

        # FIXED: Remove payment_cycle aggregation since it's deprecated
        # Keeping the structure for backward compatibility but with empty data
        by_payment_cycle = []

        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'total': {'AFN': float(total_afn), 'USD': float(total_usd)},
            'by_status': list(by_status),
            'by_payment_cycle': by_payment_cycle,
            'payment_count': payments.count()
        }
    
    def _payroll_report(self, period, start_date, end_date):
        """Payroll detailed report"""
        payment_filter = self._get_date_filter(period, start_date, end_date, 'payment_date')
        
        payrolls = Payroll.objects.filter(**payment_filter).select_related('employee')
        advances = Advance.objects.filter(**payment_filter).select_related('employee')
        
        payroll_afn = payrolls.filter(currency='AFN').aggregate(total=Sum('salary'))['total'] or 0
        payroll_usd = payrolls.filter(currency='USD').aggregate(total=Sum('salary'))['total'] or 0
        
        advance_afn = advances.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        advance_usd = advances.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        by_employee = payrolls.values(
            'employee__full_name', 'currency'
        ).annotate(total=Sum('salary'))
        
        advances_by_employee = advances.values(
            'employee__full_name', 'currency'
        ).annotate(total=Sum('amount'))
        
        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'payroll': {
                'total': {'AFN': float(payroll_afn), 'USD': float(payroll_usd)},
                'by_employee': list(by_employee)
            },
            'advances': {
                'total': {'AFN': float(advance_afn), 'USD': float(advance_usd)},
                'by_employee': list(advances_by_employee)
            }
        }
    
    def _rental_report(self, period, start_date, end_date):
        """Rental income detailed report"""
        today = timezone.now().date()
        
        active_rentals = ShopRental.objects.filter(
            rental_status='active',
            start_date__lte=today,
            end_date__gte=today
        ).select_related('shop', 'tenant')
        
        total_afn = active_rentals.filter(currency='AFN').aggregate(total=Sum('monthly_rent'))['total'] or 0
        total_usd = active_rentals.filter(currency='USD').aggregate(total=Sum('monthly_rent'))['total'] or 0
        
        by_shop = active_rentals.values('shop__shop_number', 'shop__name', 'currency').annotate(
            total=Sum('monthly_rent')
        )
        
        expiring_soon = ShopRental.objects.filter(
            rental_status='active',
            end_date__lte=today + timedelta(days=30),
            end_date__gte=today
        ).count()
        
        return {
            'period': period,
            'generated_at': timezone.now().isoformat(),
            'total_monthly_income': {'AFN': float(total_afn), 'USD': float(total_usd)},
            'active_rentals': active_rentals.count(),
            'by_shop': list(by_shop),
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
        """Generate daily report"""
        try:
            report_date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            report_date = timezone.now().date()
        
        # Student payments
        student_payments = StudentPayment.objects.filter(payment_date=report_date)
        student_total_afn = student_payments.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        student_total_usd = student_payments.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Expenses
        expenses = Expense.objects.filter(expense_date=report_date)
        expense_total_afn = expenses.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        expense_total_usd = expenses.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Other income
        other_income = OtherIncome.objects.filter(income_date=report_date)
        income_total_afn = other_income.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        income_total_usd = other_income.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Payroll payments
        payrolls = Payroll.objects.filter(payment_date=report_date)
        payroll_total_afn = payrolls.filter(currency='AFN').aggregate(total=Sum('salary'))['total'] or 0
        payroll_total_usd = payrolls.filter(currency='USD').aggregate(total=Sum('salary'))['total'] or 0
        
        return {
            'date': date,
            'generated_at': timezone.now().isoformat(),
            'student_payments': {
                'total': {'AFN': float(student_total_afn), 'USD': float(student_total_usd)},
                'count': student_payments.count()
            },
            'expenses': {
                'total': {'AFN': float(expense_total_afn), 'USD': float(expense_total_usd)},
                'count': expenses.count()
            },
            'other_income': {
                'total': {'AFN': float(income_total_afn), 'USD': float(income_total_usd)},
                'count': other_income.count()
            },
            'payroll': {
                'total': {'AFN': float(payroll_total_afn), 'USD': float(payroll_total_usd)},
                'count': payrolls.count()
            },
            'net_position': {
                'AFN': float(student_total_afn) + float(income_total_afn) - float(expense_total_afn) - float(payroll_total_afn),
                'USD': float(student_total_usd) + float(income_total_usd) - float(expense_total_usd) - float(payroll_total_usd)
            }
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