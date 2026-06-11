from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum
from datetime import datetime, timedelta
from api.models.data.expenses import Expense
from api.models.data.payroll import Payroll
from api.models.data.advance import Advance
from api.models.data.student_finance import StudentPayment
from api.models.data.shop_rental import ShopRental
from api.models.data.other_income import OtherIncome
from django.utils import timezone


class FinancialReportView(APIView):
    """
    Financial report endpoint that returns income, expenses, and profit by currency
    Supports filtering by period (daily, weekly, monthly, yearly, custom)
    """
    
    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        # Calculate date range based on period
        payment_filter = self._get_payment_date_filter(period, start_date, end_date)
        expense_filter = self._get_expense_date_filter(period, start_date, end_date)
        
        # Student Payments (income)
        student_payment_query = StudentPayment.objects.filter(**payment_filter)
        student_income_afn = student_payment_query.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        student_income_usd = student_payment_query.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Rental Income
        rental_query = ShopRental.objects.filter(start_date__lte=timezone.now().date())
        rental_income_afn = rental_query.filter(currency='AFN').aggregate(total=Sum('monthly_rent'))['total'] or 0
        rental_income_usd = rental_query.filter(currency='USD').aggregate(total=Sum('monthly_rent'))['total'] or 0
        
        # Other Income
        other_income_filter = self._get_income_date_filter(period, start_date, end_date)
        other_income_query = OtherIncome.objects.filter(**other_income_filter)
        other_income_afn = other_income_query.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        other_income_usd = other_income_query.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Total Income
        total_income_afn = float(student_income_afn) + float(rental_income_afn) + float(other_income_afn)
        total_income_usd = float(student_income_usd) + float(rental_income_usd) + float(other_income_usd)
        
        # Expenses
        expense_query = Expense.objects.filter(**expense_filter)
        expense_afn = expense_query.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        expense_usd = expense_query.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Expense breakdown by category
        expense_by_category = []
        category_data = expense_query.values('category__name', 'currency').annotate(total=Sum('amount'))
        for item in category_data:
            expense_by_category.append({
                'category': item['category__name'],
                'currency': item['currency'],
                'amount': float(item['total'])
            })
        
        # Payroll expenses
        payroll_query = Payroll.objects.filter(**payment_filter)
        payroll_afn = payroll_query.filter(currency='AFN').aggregate(total=Sum('salary'))['total'] or 0
        payroll_usd = payroll_query.filter(currency='USD').aggregate(total=Sum('salary'))['total'] or 0
        
        # Advance expenses
        advance_query = Advance.objects.filter(**payment_filter)
        advance_afn = advance_query.filter(currency='AFN').aggregate(total=Sum('amount'))['total'] or 0
        advance_usd = advance_query.filter(currency='USD').aggregate(total=Sum('amount'))['total'] or 0
        
        # Total expenses
        total_expense_afn = float(expense_afn) + float(payroll_afn) + float(advance_afn)
        total_expense_usd = float(expense_usd) + float(payroll_usd) + float(advance_usd)
        
        # Profit calculation
        profit_afn = total_income_afn - total_expense_afn
        profit_usd = total_income_usd - total_expense_usd
        
        return Response({
            'period': period,
            'date_range': {
                'start': payment_filter.get('payment_date__gte') or expense_filter.get('expense_date__gte'),
                'end': payment_filter.get('payment_date__lte') or expense_filter.get('expense_date__lte')
            },
            'income': {
                'student_payments': {
                    'AFN': float(student_income_afn),
                    'USD': float(student_income_usd)
                },
                'rental_income': {
                    'AFN': float(rental_income_afn),
                    'USD': float(rental_income_usd)
                },
                'other_income': {
                    'AFN': float(other_income_afn),
                    'USD': float(other_income_usd)
                },
                'total': {
                    'AFN': total_income_afn,
                    'USD': total_income_usd
                }
            },
            'expenses': {
                'total': {
                    'AFN': total_expense_afn,
                    'USD': total_expense_usd
                },
                'breakdown': {
                    'general_expenses': {
                        'AFN': float(expense_afn),
                        'USD': float(expense_usd)
                    },
                    'payroll': {
                        'AFN': float(payroll_afn),
                        'USD': float(payroll_usd)
                    },
                    'advances': {
                        'AFN': float(advance_afn),
                        'USD': float(advance_usd)
                    }
                },
                'by_category': expense_by_category
            },
            'profit': {
                'AFN': profit_afn,
                'USD': profit_usd
            }
        }, status=status.HTTP_200_OK)
    
    def _get_payment_date_filter(self, period, start_date=None, end_date=None):
        """Calculate date filter for payment_date field"""
        today = datetime.now().date()
        
        if period == 'custom' and start_date and end_date:
            return {
                'payment_date__gte': datetime.strptime(start_date, '%Y-%m-%d').date(),
                'payment_date__lte': datetime.strptime(end_date, '%Y-%m-%d').date()
            }
        elif period == 'daily':
            return {'payment_date': today}
        elif period == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            return {'payment_date__gte': week_start, 'payment_date__lte': today}
        elif period == 'monthly':
            month_start = today.replace(day=1)
            return {'payment_date__gte': month_start, 'payment_date__lte': today}
        elif period == 'yearly':
            year_start = today.replace(month=1, day=1)
            return {'payment_date__gte': year_start, 'payment_date__lte': today}
        else:
            return {}
    
    def _get_expense_date_filter(self, period, start_date=None, end_date=None):
        """Calculate date filter for expense_date field"""
        today = datetime.now().date()
        
        if period == 'custom' and start_date and end_date:
            return {
                'expense_date__gte': datetime.strptime(start_date, '%Y-%m-%d').date(),
                'expense_date__lte': datetime.strptime(end_date, '%Y-%m-%d').date()
            }
        elif period == 'daily':
            return {'expense_date': today}
        elif period == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            return {'expense_date__gte': week_start, 'expense_date__lte': today}
        elif period == 'monthly':
            month_start = today.replace(day=1)
            return {'expense_date__gte': month_start, 'expense_date__lte': today}
        elif period == 'yearly':
            year_start = today.replace(month=1, day=1)
            return {'expense_date__gte': year_start, 'expense_date__lte': today}
        else:
            return {}
    
    def _get_income_date_filter(self, period, start_date=None, end_date=None):
        """Calculate date filter for income_date field"""
        today = datetime.now().date()
        
        if period == 'custom' and start_date and end_date:
            return {
                'income_date__gte': datetime.strptime(start_date, '%Y-%m-%d').date(),
                'income_date__lte': datetime.strptime(end_date, '%Y-%m-%d').date()
            }
        elif period == 'daily':
            return {'income_date': today}
        elif period == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            return {'income_date__gte': week_start, 'income_date__lte': today}
        elif period == 'monthly':
            month_start = today.replace(day=1)
            return {'income_date__gte': month_start, 'income_date__lte': today}
        elif period == 'yearly':
            year_start = today.replace(month=1, day=1)
            return {'income_date__gte': year_start, 'income_date__lte': today}
        else:
            return {}