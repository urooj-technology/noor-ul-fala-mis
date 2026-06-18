from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum

from api.models.data.shop_rental import ShopRental
from api.models.data.accounting import Account, JournalEntry
from api.services.financial_report_service import (
    build_financial_summary,
    build_payroll_report,
    build_accounting_report,
    get_date_range,
)
from api.utils.excel_export import export_to_excel
from api.utils.pdf_export import export_to_pdf
from api.utils.calendar import to_gregorian_date_str


class ComprehensiveReportView(APIView):
    """Clean comprehensive reports backed by journal entries."""

    def get(self, request):
        report_type = request.query_params.get('type', 'overview')
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        export_format = request.query_params.get('export')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')

        start_date, end_date = self._convert_dates(calendar_type, start_date, end_date)
        data = self._generate_report(report_type, period, start_date, end_date)

        if export_format == 'excel':
            return self._export_excel(data, report_type)
        if export_format == 'pdf':
            return self._export_pdf(data, report_type)

        return Response(data, status=status.HTTP_200_OK)

    def _convert_dates(self, calendar_type, start_date, end_date):
        return (
            to_gregorian_date_str(start_date, calendar_type),
            to_gregorian_date_str(end_date, calendar_type),
        )

    def _generate_report(self, report_type, period, start_date, end_date):
        if report_type in ('overview', 'summary', 'financial'):
            return build_financial_summary(period, start_date, end_date)
        if report_type == 'payroll':
            return build_payroll_report(period, start_date, end_date)
        if report_type in ('student_payments', 'students'):
            return self._student_payments_report(period, start_date, end_date)
        if report_type == 'rental':
            return self._rental_report(period, start_date, end_date)
        if report_type in ('trial_balance', 'income_statement', 'balance_sheet'):
            return build_accounting_report(report_type, period, start_date, end_date)
        return build_financial_summary(period, start_date, end_date)

    def _student_payments_report(self, period, start_date, end_date):
        """Report student cash collections from active journal entries."""
        date_range = get_date_range(period, start_date, end_date)
        result = {'AFN': 0.0, 'USD': 0.0}
        details = {'AFN': [], 'USD': []}

        entries = JournalEntry.active().filter(
            transaction__transaction_type='student_payment',
            account__code__startswith='1000_',
            debit__gt=0,
        ).select_related('transaction')

        if date_range['start']:
            entries = entries.filter(date__gte=date_range['start'])
        if date_range['end']:
            entries = entries.filter(date__lte=date_range['end'])

        for entry in entries.order_by('-date')[:500]:
            currency = entry.account.code.split('_')[-1]
            amount = float(entry.debit or 0)
            if amount == 0:
                continue
            result[currency] = result.get(currency, 0) + amount
            description = entry.description or entry.transaction.description or 'Student Payment'
            description = description.replace('Student Payment - ', '').replace('Student Payment Reversal - ', '')
            details.setdefault(currency, []).append({
                'date': str(entry.date),
                'description': description,
                'amount': amount,
                'reference': entry.reference or entry.transaction.reference,
            })

        return {
            'period': period,
            'date_range': date_range,
            'generated_at': timezone.now().isoformat(),
            'total': result,
            'payment_count': sum(len(v) for v in details.values()),
            'details': details,
            'note': 'Totals reflect active student-payment journal entries (cash collected).',
        }

    def _rental_report(self, period, start_date, end_date):
        today = timezone.now().date()
        date_range = get_date_range(period, start_date, end_date)
        summary = build_financial_summary(period, start_date, end_date)

        return {
            'period': period,
            'date_range': date_range,
            'generated_at': timezone.now().isoformat(),
            'total_received': summary['income']['rental'],
            'active_rentals': ShopRental.objects.filter(
                rental_status='active', start_date__lte=today, end_date__gte=today
            ).count(),
            'expiring_within_30_days': ShopRental.objects.filter(
                rental_status='active',
                end_date__lte=today + timedelta(days=30),
                end_date__gte=today,
            ).count(),
        }

    def _export_excel(self, data, report_type):
        headers, rows = self._prepare_export_data(data, report_type)
        return export_to_excel(
            data=rows,
            headers=headers,
            filename=f'{report_type}_report_{timezone.now().strftime("%Y%m%d")}.xlsx',
            sheet_name=report_type.replace('_', ' ').title(),
            title=f'{report_type.replace("_", " ").title()} Report',
            metadata={'Generated': timezone.now().strftime('%Y-%m-%d %H:%M')},
        )

    def _export_pdf(self, data, report_type):
        headers, rows = self._prepare_export_data(data, report_type)
        return export_to_pdf(
            data=rows,
            headers=headers,
            filename=f'{report_type}_report_{timezone.now().strftime("%Y%m%d")}.pdf',
            title=f'{report_type.replace("_", " ").title()} Report',
            metadata={'Generated': timezone.now().strftime('%Y-%m-%d %H:%M')},
        )

    def _prepare_export_data(self, data, report_type):
        if report_type in ('overview', 'summary', 'financial'):
            headers = ['Category', 'AFN', 'USD']
            rows = [
                ['Student Income', data['income']['student']['AFN'], data['income']['student']['USD']],
                ['Rental Income', data['income']['rental']['AFN'], data['income']['rental']['USD']],
                ['Other Income', data['income']['other']['AFN'], data['income']['other']['USD']],
                ['Total Income', data['income']['total']['AFN'], data['income']['total']['USD']],
                ['', '', ''],
                ['Payroll', data['expenses']['payroll']['AFN'], data['expenses']['payroll']['USD']],
                ['General Expenses', data['expenses']['general']['AFN'], data['expenses']['general']['USD']],
                ['Employee Advances', data['expenses']['advances']['AFN'], data['expenses']['advances']['USD']],
                ['Total Outflows', data['expenses']['total']['AFN'], data['expenses']['total']['USD']],
                ['Net Profit', data['profit']['AFN'], data['profit']['USD']],
                ['Net Cash Position', data['net_cash_position']['AFN'], data['net_cash_position']['USD']],
            ]
            return headers, rows
        return ['Field', 'Value'], [['Report', report_type]]


class DailyReportView(APIView):
    """Daily financial snapshot."""

    def get(self, request):
        date = request.query_params.get('date', timezone.now().date().isoformat())
        report = build_financial_summary('custom', date, date)
        report['date'] = date
        return Response(report, status=status.HTTP_200_OK)
