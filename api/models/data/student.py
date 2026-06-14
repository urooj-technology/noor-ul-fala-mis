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
        ordering = [models.functions.Cast('level', output_field=models.IntegerField())]

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
    # DEPRECATED fields - kept for backward compatibility only
    payment_cycle = models.CharField(
        max_length=10,
        default='monthly',
        blank=True,
        null=True,
        help_text='DEPRECATED: Legacy field'
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



    def _get_finance_models(self):
        """Get finance models using apps.get_model to avoid circular imports"""
        StudentFeeAssignment = apps.get_model('api', 'StudentFeeAssignment')
        StudentPayment = apps.get_model('api', 'StudentPayment')
        return StudentFeeAssignment, StudentPayment

    @property
    def effective_fee(self):
        """Get total expected fees from StudentFeeAssignment for current class level | کل فیسهای مورد انتظار"""
        StudentFeeAssignment = self._get_finance_models()[0]
        total = StudentFeeAssignment.objects.filter(
            student=self,
            is_active=True,
            class_level=self.class_level
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

    def get_total_payments(self, class_level=None):
        """Calculate total completed payments made by student
        
        Args:
            class_level: Optional - filter payments by class level. If None, uses student's current class_level.
        """
        StudentPayment = self._get_finance_models()[1]
        level = class_level if class_level is not None else self.class_level
        total = StudentPayment.objects.filter(
            assignment__student=self,
            assignment__class_level=level,
            payment_status='completed'
        ).aggregate(total=models.Sum('amount'))['total']
        return total if total else Decimal('0')

    def get_fee_breakdown(self, class_level=None):
        """Get fee breakdown for the student for a specific class level
        
        Args:
            class_level: Optional - filter by class level. If None, uses student's current class_level.
        """
        StudentFeeAssignment, StudentPayment = self._get_finance_models()
        
        level = class_level if class_level is not None else self.class_level
        assignments = StudentFeeAssignment.objects.filter(
            student=self, 
            is_active=True,
            class_level=level
        ).select_related('fee_type')
        
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
                'class_level_id': assignment.class_level.id if assignment.class_level else None,
                'class_level_name': assignment.class_level.name if assignment.class_level else None,
            })
        
        return fee_breakdown

    def get_remaining_balance(self, class_level=None):
        """
        FIXED: Calculate remaining balance for a specific class level.
        
        Args:
            class_level: Optional - filter by class level. If None, uses student's current class_level.
        """
        StudentFeeAssignment, StudentPayment = self._get_finance_models()
        
        level = class_level if class_level is not None else self.class_level
        
        expected = StudentFeeAssignment.objects.filter(
            student=self, is_active=True, class_level=level
        ).aggregate(total=models.Sum('amount'))['total']
        expected = expected if expected else Decimal('0')
        
        paid = StudentPayment.objects.filter(
            assignment__student=self, 
            assignment__class_level=level,
            payment_status='completed'
        ).aggregate(total=models.Sum('amount'))['total']
        paid = paid if paid else Decimal('0')
        
        return max(expected - paid, Decimal('0'))

    def get_financial_summary(self, class_level=None):
        """
        FIXED: Returns Decimal values (not floats) for financial accuracy.
        Now filtered by class_level - each level has separate finances.
        
        Args:
            class_level: Optional - filter by class level. If None, uses student's current class_level.
        """
        StudentFeeAssignment, StudentPayment = self._get_finance_models()
        
        level = class_level if class_level is not None else self.class_level
        
        # Get total expected fees from assignments for this level
        expected = StudentFeeAssignment.objects.filter(
            student=self, is_active=True, class_level=level
        ).aggregate(total=models.Sum('amount'))['total']
        expected = expected if expected else Decimal('0')
        
        # Get total paid from payments (linked via assignment) for this level
        total_payments = StudentPayment.objects.filter(
            assignment__student=self, 
            assignment__class_level=level,
            payment_status='completed'
        ).aggregate(total=models.Sum('amount'))['total']
        total_payments = total_payments if total_payments else Decimal('0')
        
        # Calculate remaining balance
        remaining = expected - total_payments
        if remaining < 0:
            remaining = Decimal('0')
        
        # Build fee breakdown by type from assignments and payments for this level
        assignments = StudentFeeAssignment.objects.filter(
            student=self, is_active=True, class_level=level
        ).select_related('fee_type')
        by_fee_type = {}
        
        for assignment in assignments:
            fee_name = assignment.fee_type.name if assignment.fee_type else 'Unknown'
            if fee_name not in by_fee_type:
                by_fee_type[fee_name] = {
                    'expected': Decimal('0'),
                    'paid': Decimal('0'),
                    'remaining': Decimal('0'),
                    'class_level_id': level.id if level else None,
                    'class_level_name': level.name if level else None,
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
            'registration_number': self.registration_number,
            'status': self.status,
            'class_level': level.name if level else None,
            'class_level_id': level.id if level else None,
            'by_fee_type': by_fee_type,
        }