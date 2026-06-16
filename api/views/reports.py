from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta
from django.utils import timezone
from api.services.accounting_service import AccountingService


class FinancialReportView(APIView):
    """
    Financial report endpoint that returns income, expenses, and profit by currency
    Uses the accounting system (journal entries) as the single source of truth
    Supports filtering by period (daily, weekly, monthly, yearly, custom)
    """
    
    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Get date range based on period
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
                    income_by_type[currency]['student_payments'] = income_by_type[currency].get('student_payments', 0) + amount
                elif 'rental' in name.lower():
                    income_by_type[currency]['rental_income'] = income_by_type[currency].get('rental_income', 0) + amount
                else:
                    income_by_type[currency]['other_income'] = income_by_type[currency].get('other_income', 0) + amount
            
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
                    expense_by_type[currency]['general_expenses'] = expense_by_type[currency].get('general_expenses', 0) + amount
        
        # Calculate profit
        profit = {
            'AFN': total_income['AFN'] - total_expenses['AFN'],
            'USD': total_income['USD'] - total_expenses['USD']
        }
        
        return Response({
            'period': period,
            'date_range': date_range,
            'income': {
                'student_payments': {
                    'AFN': income_by_type['AFN'].get('student_payments', 0),
                    'USD': income_by_type['USD'].get('student_payments', 0)
                },
                'rental_income': {
                    'AFN': income_by_type['AFN'].get('rental_income', 0),
                    'USD': income_by_type['USD'].get('rental_income', 0)
                },
                'other_income': {
                    'AFN': income_by_type['AFN'].get('other_income', 0),
                    'USD': income_by_type['USD'].get('other_income', 0)
                },
                'total': total_income
            },
            'expenses': {
                'total': total_expenses,
                'breakdown': {
                    'general_expenses': {
                        'AFN': expense_by_type['AFN'].get('general_expenses', 0),
                        'USD': expense_by_type['USD'].get('general_expenses', 0)
                    },
                    'payroll': {
                        'AFN': expense_by_type['AFN'].get('payroll', 0),
                        'USD': expense_by_type['USD'].get('payroll', 0)
                    },
                    'advances': {
                        'AFN': expense_by_type['AFN'].get('advances', 0),
                        'USD': expense_by_type['USD'].get('advances', 0)
                    }
                }
            },
            'profit': profit
        }, status=status.HTTP_200_OK)
    
    def _get_date_range(self, period, start_date=None, end_date=None):
        """Calculate date range based on period"""
        today = timezone.now().date()
        
        if period == 'custom' and start_date and end_date:
            return {
                'start': start_date,
                'end': end_date
            }
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