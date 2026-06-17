from django.db import models
from api.models.data.base import BaseModel
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY


class Employee(BaseModel):
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=DEFAULT_CURRENCY)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.full_name} - {self.position or 'No Position'}"
    
    def get_total_salary_paid(self):
        """Calculate total salary paid to employee"""
        from api.models.data.payroll import Payroll
        total = Payroll.objects.filter(employee=self).aggregate(
            total=models.Sum('salary')
        )['total'] or 0
        return total
    
    def get_total_advances_paid(self):
        """Calculate total advances paid to employee"""
        from api.models.data.advance import Advance
        total = Advance.objects.filter(employee=self).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        return total
    
    def get_financial_summary(self):
        """Get complete financial summary for employee"""
        return {
            'total_salary_paid': self.get_total_salary_paid(),
            'total_advances_paid': self.get_total_advances_paid(),
            'monthly_salary': self.salary,
            'currency': self.currency
        }

    def get_period_financial_summary(self, month, year):
        """Get financial summary for a specific month/year period"""
        from decimal import Decimal
        from api.utils.calendar import matches_shamsi_period

        month = int(month)
        year = int(year)

        payroll_paid = Decimal('0.00')
        for payroll in self.payrolls.filter(is_deleted=False):
            if matches_shamsi_period(payroll.month, payroll.year, payroll.payment_date, month, year):
                payroll_paid += payroll.salary or Decimal('0.00')

        advance_paid = Decimal('0.00')
        for advance in self.advances.filter(is_deleted=False):
            if matches_shamsi_period(advance.month, advance.year, advance.payment_date, month, year):
                advance_paid += advance.amount or Decimal('0.00')

        monthly_salary = self.salary or Decimal('0.00')
        overall_paid = payroll_paid + advance_paid
        remaining_amount = monthly_salary - overall_paid

        return {
            'total_salary': float(monthly_salary),
            'payroll_paid': float(payroll_paid),
            'advance_paid': float(advance_paid),
            'overall_paid': float(overall_paid),
            'remaining_amount': float(remaining_amount),
            'currency': {
                'code': self.currency or 'USD',
            },
            'month': month,
            'year': year,
        }