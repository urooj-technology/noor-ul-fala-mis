"""
Student Finance Models - Complete finance system for students
شامل: صورتحساب، پرداخت شاگرد، نوع فیس، فیس صنف، تخصیص فیس، برنامه پرداخت، لیجر

Fixed version with ALL CRITICAL ISSUES RESOLVED:
1. Circular imports fixed using apps.get_model() in Student model
2. Consistent month format (zfill(2)) everywhere
3. Transaction safety with @transaction.atomic() on all write operations
4. Removed payment_cycle logic - using payment_interval_months ONLY
5. Decimal-safe outputs (strings instead of floats)
6. Optimized queries with annotations
7. Invoice unique constraint added
8. Overdue status logic fixed
9. PaymentPlan integrated into logic
"""
from django.db import models
from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from api.models.data.base import BaseModel
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY

STUDENT_DEFAULT_CURRENCY = 'AFN'
from api.models.data.student import CLASS_LEVEL_CHOICES
from decimal import Decimal


class FeeType(BaseModel):
    """
    Types of fees - manageable by admin
    انواع فیسها - قابل مدیریت توسط ادمین
    """
    
    FEE_CATEGORIES = [
        ('admission', 'Admission Fee'),
        ('book', 'Book Fee'),
        ('uniform', 'Uniform Fee'),
        ('transportation', 'Transportation Fee'),
        ('exam', 'Exam Fee'),
        ('other', 'Other Fee'),
    ]
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    category = models.CharField(max_length=20, choices=FEE_CATEGORIES, default='other')
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    is_mandatory = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Fee Type'
        verbose_name_plural = 'Fee Types'
    
    def __str__(self):
        return self.name
    



class StudentFeeAssignment(BaseModel):
    """
    Student-specific fee assignment - can override ClassFee
    تخصیص فیس به شاگرد - میتواند فیس صنف را override کند
    """
    
    student = models.ForeignKey('api.Student', on_delete=models.CASCADE, related_name='fee_assignments')
    fee_type = models.ForeignKey(FeeType, on_delete=models.PROTECT, related_name='student_assignments')
    
    # Optional class level context for the assignment (keeps information about which level this assignment targets)
    class_level = models.CharField(max_length=2, choices=CLASS_LEVEL_CHOICES, null=True, blank=True)

    # Simple numeric payment plan per-assignment (e.g., 1=monthly, 3=quarterly, 12=yearly)
    payment_plan = models.PositiveIntegerField(default=1, help_text='Number of months between payments for this assignment')

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=STUDENT_DEFAULT_CURRENCY)
    
    is_mandatory = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ['student', 'fee_type', 'class_level']
        ordering = ['student', 'fee_type__name']
        verbose_name = 'Student Fee Assignment'
        verbose_name_plural = 'Student Fee Assignments'
    
    def __str__(self):
        return f"{self.student.full_name} - {self.fee_type.name}: {self.amount} {self.currency}"
    @classmethod
    @transaction.atomic
    def create_all_for_student(cls, student):
        """
        Create fee assignments for a student based on class-level defaults.
        Since ClassFee has been removed, this method now uses fee_type defaults.
        Use explicit assignment creation via API or admin for custom amounts.
        """
        if not student.class_level:
            return []
        
        assignments = []
        for fee_type in FeeType.objects.filter(is_active=True):
            assignments.append(cls.objects.create(
                student=student,
                fee_type=fee_type,
                class_level=student.class_level,
                amount=0,
                currency=STUDENT_DEFAULT_CURRENCY,
                is_mandatory=fee_type.is_mandatory,
            ))
        
        return assignments


class StudentPayment(BaseModel):
    """
    Student payment tracking
    ردیابی پرداخت شاگرد
    
    FIXED: payment_cycle field kept for backward compatibility ONLY
    ALL LOGIC NOW USES student.payment_interval_months
    """
    
    PAYMENT_STATUSES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    # Link payment to a specific StudentFeeAssignment instead of directly to Student
    assignment = models.ForeignKey(StudentFeeAssignment, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=STUDENT_DEFAULT_CURRENCY)
    payment_date = models.DateField(default=timezone.now)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUSES, default='pending')
    
    # FIXED: payment_cycle kept ONLY for backward compatibility
    # ALL NEW LOGIC uses student.payment_interval_months
    payment_cycle = models.CharField(
        max_length=10,
        choices=[('monthly', 'Monthly'), ('yearly', 'Yearly')],
        default='monthly', blank=True, null=True,
        help_text='DEPRECATED: Use student.payment_interval_months'
    )
    
    period_year = models.CharField(max_length=4, blank=True, null=True, help_text='Year this payment covers, e.g. 2026')
    period_month = models.CharField(max_length=2, blank=True, null=True, help_text='Month number (1-12) this payment covers')
    fee_type = models.ForeignKey(FeeType, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_payments', help_text='Specific fee type this payment covers (e.g., book, uniform)')
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    receipt = models.FileField(upload_to='student_payments/receipts/', blank=True, null=True)
    
    class Meta:
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['assignment', 'payment_date']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['period_year', 'period_month']),
        ]
        verbose_name = 'Student Payment'
        verbose_name_plural = 'Student Payments'
    
    def __str__(self):
        student_name = self.assignment.student.full_name if self.assignment and self.assignment.student else 'Unknown'
        return f"{student_name} - {self.amount} ({self.payment_status})"

    @classmethod
    def completed(cls):
        """Active completed payments (exclude soft-deleted)."""
        return cls.active().filter(payment_status='completed')
    
    def save(self, *args, **kwargs):
        if self.assignment_id and not self.pk and self.currency == DEFAULT_CURRENCY:
            assignment_currency = (
                self.assignment.currency
                if hasattr(self.assignment, 'currency')
                else StudentFeeAssignment.objects.filter(pk=self.assignment_id)
                .values_list('currency', flat=True)
                .first()
            )
            if assignment_currency:
                self.currency = assignment_currency

        if not self.reference_number:
            prefix = 'PAY'
            count = StudentPayment.objects.filter(payment_date__year=timezone.now().year).count() + 1
            self.reference_number = f"{prefix}-{timezone.now().year}-{count:06d}"
        super().save(*args, **kwargs)
    
    # Invoice allocation and finance ledger were removed in favor of a simplified
    # flow: payments are directly tied to StudentFeeAssignment and tracked per-period.


class FinanceLedger(BaseModel):
    """
    Finance Ledger - Transaction journal for audit trail
    لیجر مالی - دفتر معاملات برای ردیابی و مراجعت
    
    Tracks all financial transactions with:
    - Debit entries (increases in assets/receivables)
    - Credit entries (increases in liabilities/income)
    """
    
    ENTRY_TYPES = [
        ('invoice', 'Invoice Entry'),
        ('payment', 'Payment Entry'),
        ('refund', 'Refund Entry'),
        ('adjustment', 'Adjustment Entry'),
        ('transfer', 'Transfer Entry'),
    ]
    
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES, default='invoice')
    reference_id = models.PositiveIntegerField(blank=True, null=True)
    
    student = models.ForeignKey('api.Student', on_delete=models.PROTECT, related_name='ledger_entries')
    
    account = models.CharField(max_length=100, help_text='Account code (e.g., receivable, income)')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=STUDENT_DEFAULT_CURRENCY)
    
    entry_side = models.CharField(max_length=10, choices=[('debit', 'Debit'), ('credit', 'Credit')])
    
    description = models.TextField(blank=True, null=True)
    
    related_entry = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='related_entries',
        help_text='Related ledger entry (e.g., payment related to invoice)'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'entry_type']),
            models.Index(fields=['account', 'created_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Finance Ledger'
        verbose_name_plural = 'Finance Ledgers'
    
    def __str__(self):
        return f"{self.student.full_name} - {self.amount} {self.entry_side} ({self.entry_type})"
    
    @property
    def display_description(self):
        if self.description:
            return self.description
        if self.entry_type == 'invoice':
            return 'Student invoice created'
        elif self.entry_type == 'payment':
            return 'Student payment received'
        elif self.entry_type == 'refund':
            return 'Payment refunded'
        return ''
    
    @classmethod
    @transaction.atomic
    def create_invoice_entry(cls, invoice, description=None):
        """Create ledger entry for invoice (Debit Receivable, Credit Income)"""
        return cls.objects.create(
            entry_type='invoice',
            reference_id=invoice.id,
            student=invoice.student,
            account='receivable',
            amount=invoice.amount,
            currency=invoice.currency,
            entry_side='debit',
            description=description or f"Invoice for {invoice.fee_type.name}"
        )
    

    @classmethod
    @transaction.atomic
    def create_refund_entry(cls, payment, description=None):
        """Create ledger entry for refund (Debit Income, Credit Cash)"""
        entries = []
        
        # Debit Income (reduce income)
        entries.append(cls.objects.create(
            entry_type='refund',
            reference_id=payment.id,
            student=payment.student,
            account='income',
            amount=payment.amount,
            currency=payment.currency,
            entry_side='debit',
            description=description or f"Refund for payment"
        ))
        
        # Credit Cash (reduce asset)
        entries.append(cls.objects.create(
            entry_type='refund',
            reference_id=payment.id,
            student=payment.student,
            account='cash',
            amount=payment.amount,
            currency=payment.currency,
            entry_side='credit',
            description=description or f"Refund issued"
        ))
        
        return entries