from django.db import models
from django.utils import timezone
from django.apps import apps
from api.models.data.base import BaseModel
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY
from decimal import Decimal


class ClassLevel(models.Model):
    """Class levels for students from 1 to 12"""

    CLASS_CHOICES = [
        ('1', 'Class 1'),
        ('2', 'Class 2'),
        ('3', 'Class 3'),
        ('4', 'Class 4'),
        ('5', 'Class 5'),
        ('6', 'Class 6'),
        ('7', 'Class 7'),
        ('8', 'Class 8'),
        ('9', 'Class 9'),
        ('10', 'Class 10'),
        ('11', 'Class 11'),
        ('12', 'Class 12'),
    ]

    level = models.CharField(max_length=2, choices=CLASS_CHOICES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['level']

    def __str__(self):
        return self.name


class Student(BaseModel):
    """Student registration model"""
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('graduated', 'Graduated'),
        ('suspended', 'Suspended'),
        ('transferred', 'Transferred'),
    ]

    TRANSPORTATION_CHOICES = [
        ('school_bus', 'School Bus'),
        ('private_vehicle', 'Private Vehicle'),
        ('walking', 'Walking'),
        ('public_transport', 'Public Transport'),
    ]

    # Personal Information
    full_name = models.CharField(max_length=200)
    father_name = models.CharField(max_length=200)
    grandfather_name = models.CharField(max_length=200, blank=True, null=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default='male')
    tazkira_number = models.CharField(max_length=50, unique=True)

    # Address Information
    permanent_address = models.TextField()
    current_address = models.TextField()
    province = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    area = models.CharField(max_length=100)

    # Contact Information
    parent_phone = models.CharField(max_length=20)
    student_phone = models.CharField(max_length=20, blank=True, null=True)
    alternative_phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # Registration Information
    registration_number = models.CharField(max_length=50, unique=True)
    registration_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Class & Fee Information
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        help_text='Class level the student is enrolled in'
    )
    # Payment interval - flexible (1=monthly, 2=bimonthly, 3=quarterly, etc.)
    payment_interval_months = models.PositiveIntegerField(
        default=1,
        help_text='Number of months between payments (1=monthly, 2=bimonthly, 3=quarterly, 12=yearly)'
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=DEFAULT_CURRENCY)
    
    # DEPRECATED fields - kept for backward compatibility only
    payment_cycle = models.CharField(
        max_length=10,
        default='monthly',
        blank=True,
        null=True,
        help_text='DEPRECATED: Use payment_interval_months'
    )
    monthly_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0, blank=True, null=True)
    yearly_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0, blank=True, null=True)

    # Transportation
    transportation = models.CharField(
        max_length=20,
        choices=TRANSPORTATION_CHOICES,
        default='school_bus'
    )

    # Photo
    photo = models.ImageField(upload_to='students/photos/', blank=True, null=True)

    # Documents
    tazkira_copy = models.FileField(upload_to='students/tazkira/', blank=True, null=True)
    parent_tazkira_copy = models.FileField(upload_to='students/parent_tazkira/', blank=True, null=True)
    previous_result_card = models.FileField(upload_to='students/results/', blank=True, null=True)
    payment_receipt = models.FileField(upload_to='students/receipts/', blank=True, null=True)

    class Meta:
        ordering = ['-registration_date']
        indexes = [
            models.Index(fields=['registration_number']),
            models.Index(fields=['tazkira_number']),
            models.Index(fields=['status']),
            models.Index(fields=['class_level']),
            models.Index(fields=['payment_interval_months']),
        ]

    def __str__(self):
        return f"{self.registration_number} - {self.full_name}"

    @property
    def age(self):
        """Calculate student age"""
        if self.date_of_birth:
            today = timezone.now().date()
            return today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
        return None

    @property
    def payment_interval_display(self):
        """Display text for payment interval"""
        intervals = {
            1: 'Monthly',
            2: 'Bimonthly',
            3: 'Quarterly',
            4: 'Every 4 months',
            5: 'Every 5 months',
            6: 'Semi-annually',
            12: 'Yearly',
        }
        return intervals.get(self.payment_interval_months, f'Every {self.payment_interval_months} months')

    def _get_finance_models(self):
        """Get finance models using apps.get_model to avoid circular imports"""
        StudentFeeAssignment = apps.get_model('api', 'StudentFeeAssignment')
        StudentPayment = apps.get_model('api', 'StudentPayment')
        return StudentFeeAssignment, StudentPayment

    @property
    def effective_fee(self):
        """Get total expected fees from StudentFeeAssignment | کل فیسهای مورد انتظار"""
        StudentFeeAssignment = self._get_finance_models()[0]
        total = StudentFeeAssignment.objects.filter(
            student=self,
            is_active=True
        ).aggregate(total=models.Sum('amount'))['total']
        return total if total else Decimal('0')

    def get_total_paid_for_period(self, start_date, end_date):
        """Calculate total payments made within a date range"""
        StudentPayment = self._get_finance_models()[1]
        total = StudentPayment.objects.filter(
            assignment__student=self,
            payment_status='completed',
            payment_date__gte=start_date,
            payment_date__lte=end_date
        ).aggregate(total=models.Sum('amount'))['total']
        return total if total else Decimal('0')

    def get_total_payments(self):
        """Calculate total completed payments made by student"""
        StudentPayment = self._get_finance_models()[1]
        total = StudentPayment.objects.filter(
            assignment__student=self,
            payment_status='completed'
        ).aggregate(total=models.Sum('amount'))['total']
        return total if total else Decimal('0')

    def get_fee_breakdown(self):
        """Get fee breakdown for the student"""
        StudentFeeAssignment, StudentPayment = self._get_finance_models()
        
        assignments = StudentFeeAssignment.objects.filter(student=self, is_active=True).select_related('fee_type')
        
        fee_breakdown = []
        for assignment in assignments:
            amount = float(assignment.amount) if assignment.amount else 0
            
            paid_for_fee = StudentPayment.objects.filter(
                assignment=assignment,
                payment_status='completed'
            ).aggregate(total=models.Sum('amount'))['total']
            paid = float(paid_for_fee) if paid_for_fee else 0
            
            fee_breakdown.append({
                'fee_type': assignment.fee_type.name if assignment.fee_type else 'Unknown',
                'fee_category': assignment.fee_type.category if assignment.fee_type else 'other',
                'amount': str(amount),
                'currency': assignment.currency,
                'paid_amount': str(paid),
                'remaining_amount': str(amount - paid),
                'fee_type_id': assignment.fee_type.id if assignment.fee_type else None,
            })
        
        return fee_breakdown

    def get_remaining_balance(self):
        """
        FIXED: Calculate remaining balance using payment_interval_months ONLY
        Removed payment_cycle logic completely
        """
        StudentFeeAssignment, StudentPayment = self._get_finance_models()
        
        expected = StudentFeeAssignment.objects.filter(
            student=self, is_active=True
        ).aggregate(total=models.Sum('amount'))['total']
        expected = expected if expected else Decimal('0')
        
        paid = StudentPayment.objects.filter(
            assignment__student=self, payment_status='completed'
        ).aggregate(total=models.Sum('amount'))['total']
        paid = paid if paid else Decimal('0')
        
        return max(expected - paid, Decimal('0'))

    def get_financial_summary(self):
        """
        FIXED: Returns Decimal values (not floats) for financial accuracy
        Now uses StudentFeeAssignment and StudentPayment instead of StudentInvoice
        """
        StudentFeeAssignment, StudentPayment = self._get_finance_models()
        
        # Get total expected fees from assignments
        expected = StudentFeeAssignment.objects.filter(
            student=self, is_active=True
        ).aggregate(total=models.Sum('amount'))['total']
        expected = expected if expected else Decimal('0')
        
        # Get total paid from payments (linked via assignment)
        total_payments = StudentPayment.objects.filter(
            assignment__student=self, payment_status='completed'
        ).aggregate(total=models.Sum('amount'))['total']
        total_payments = total_payments if total_payments else Decimal('0')
        
        # Calculate remaining balance
        remaining = expected - total_payments
        if remaining < 0:
            remaining = Decimal('0')
        
        # Build fee breakdown by type from assignments and payments
        assignments = StudentFeeAssignment.objects.filter(student=self, is_active=True).select_related('fee_type')
        by_fee_type = {}
        
        for assignment in assignments:
            fee_name = assignment.fee_type.name if assignment.fee_type else 'Unknown'
            if fee_name not in by_fee_type:
                by_fee_type[fee_name] = {
                    'expected': Decimal('0'),
                    'paid': Decimal('0'),
                    'remaining': Decimal('0'),
                }
            
            by_fee_type[fee_name]['expected'] += assignment.amount
            
            # Calculate paid for this fee type from payments
            paid_for_fee = StudentPayment.objects.filter(
                assignment=assignment,
                payment_status='completed'
            ).aggregate(total=models.Sum('amount'))['total']
            paid_for_fee = paid_for_fee if paid_for_fee else Decimal('0')
            
            by_fee_type[fee_name]['paid'] += paid_for_fee
            by_fee_type[fee_name]['remaining'] += assignment.amount - paid_for_fee
        
        return {
            'total_payments': total_payments,
            'total_invoices': expected,  # 'invoices' now means total expected from assignments
            'total_paid_invoices': total_payments,
            'remaining_balance': remaining,
            'payment_interval_months': self.payment_interval_months,
            'payment_interval_display': self.payment_interval_display,
            'currency': self.currency,
            'registration_number': self.registration_number,
            'status': self.status,
            'class_level': self.class_level.name if self.class_level else None,
            'by_fee_type': by_fee_type,
        }