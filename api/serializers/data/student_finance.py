"""
Student Finance Serializers - All fee and payment-related serializers
سریالایزرهای مالی شاگرد - همه سریالایزرهای مربوط به فیس و پرداخت
"""
from rest_framework import serializers
from decimal import Decimal
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from api.models.data.student_finance import (
    FeeType, StudentFeeAssignment, StudentPayment, FinanceLedger
)
from api.models.data.student import Student, CLASS_LEVEL_CHOICES
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class FeeTypeSerializer(DataRootSerializer):
    """Serializer for FeeType model"""
    
    class Meta:
        model = FeeType
        fields = [
            'id', 'name', 'code', 'category', 'description',
            'is_active', 'is_mandatory', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class FeeTypeMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for FeeType (for nested use)"""
    
    class Meta:
        model = FeeType
        fields = ['id', 'name', 'code', 'category']





class StudentFeeAssignmentSerializer(DataRootSerializer):
    """Serializer for StudentFeeAssignment model | سریالایزر برای مدل تخصیص فیس شاگرد"""
    
    fee_type_details = serializers.SerializerMethodField()
    class_level_details = serializers.SerializerMethodField()
    student_details = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_registration = serializers.CharField(source='student.registration_number', read_only=True)
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentFeeAssignment
        fields = [
            'id', 'student', 'student_name', 'student_registration', 'student_details',
            'fee_type', 'fee_type_details', 'amount', 'currency',
            'is_mandatory', 'is_active', 'notes',
            'class_level', 'class_level_details', 'payment_plan',
            'paid_amount', 'remaining_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'paid_amount', 'remaining_amount', 'class_level_details', 'student_details']
    
    def get_fee_type_details(self, obj):
        if obj.fee_type:
            return FeeTypeMinimalSerializer(obj.fee_type).data
        return None
    
    def get_class_level_details(self, obj):
        if getattr(obj, 'class_level', None):
            return {
                'id': obj.class_level,
                'level': obj.class_level,
                'name': dict(CLASS_LEVEL_CHOICES).get(obj.class_level, obj.class_level),
            }
        return None
    
    def get_student_details(self, obj):
        if obj.student:
            return {
                'id': obj.student.id,
                'full_name': obj.student.full_name,
                'registration_number': obj.student.registration_number,
                'currency': obj.student.currency if hasattr(obj.student, 'currency') else 'AFN',
                'total_paid': str(obj.student.get_total_payments()) if hasattr(obj.student, 'get_total_payments') else '0',
                'remaining_balance': str(obj.student.get_remaining_balance()) if hasattr(obj.student, 'get_remaining_balance') else '0',
            }
        return None
    
    def get_paid_amount(self, obj):
        """Get total paid amount for this assignment"""
        paid = StudentPayment.completed().filter(
            assignment=obj,
        ).aggregate(total=models.Sum('amount'))['total']
        return str(paid) if paid else '0'
    
    def get_remaining_amount(self, obj):
        """Calculate remaining amount for this assignment"""
        from django.db.models import Sum
        from decimal import Decimal
        
        amount = obj.amount if obj.amount else Decimal('0')
        paid = StudentPayment.completed().filter(
            assignment=obj,
        ).aggregate(total=Sum('amount'))['total']
        paid = Decimal(str(paid)) if paid else Decimal('0')
        
        remaining = amount - paid
        return str(max(Decimal('0'), remaining))



# StudentInvoice and FinanceLedger serializers removed — system now uses StudentFeeAssignment and StudentPayment


class StudentPaymentSerializer(DataRootSerializer):
    """Serializer for StudentPayment model | سریالایزر برای مدل پرداخت شاگرد"""
    
    assignment_details = serializers.SerializerMethodField()
    currency_details = serializers.SerializerMethodField()
    
    # Calendar dates
    payment_date_shamsi = serializers.SerializerMethodField(read_only=True)
    payment_date_qamari = serializers.SerializerMethodField(read_only=True)
    
    # Computed fields (Decimal-safe)
    amount_str = serializers.SerializerMethodField()
    fee_type_details = serializers.SerializerMethodField()
    period_months = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentPayment
        fields = [
            'id', 'assignment', 'amount', 'amount_str', 'currency', 'payment_date',
            'payment_status', 'payment_cycle', 'period_year', 'period_month', 'period_months',
            'fee_type', 'fee_type_details',
            'reference_number', 'description', 'receipt',
            'assignment_details', 'currency_details',
            'payment_date_shamsi', 'payment_date_qamari',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['reference_number', 'currency_details', 'payment_date_shamsi', 'payment_date_qamari', 'fee_type_details', 'period_months']
    
    def get_assignment_details(self, obj):
        if obj.assignment:
            student = obj.assignment.student
            return {
                'id': obj.assignment.id,
                'student_id': student.id if student else None,
                'student_name': student.full_name if student else None,
                'student_details': {
                    'id': student.id if student else None,
                    'full_name': student.full_name if student else None,
                    'registration_number': student.registration_number if student else None,
                    'currency': student.currency if student and hasattr(student, 'currency') else 'AFN',
                    'total_paid': str(student.get_total_payments()) if student and hasattr(student, 'get_total_payments') else '0',
                    'remaining_balance': str(student.get_remaining_balance()) if student and hasattr(student, 'get_remaining_balance') else '0',
                } if student else None,
                'fee_type': obj.assignment.fee_type.id if obj.assignment.fee_type else None,
                'fee_type_name': obj.assignment.fee_type.name if obj.assignment.fee_type else None,
                'fee_type_details': FeeTypeMinimalSerializer(obj.assignment.fee_type).data if obj.assignment.fee_type else None,
                'payment_plan': obj.assignment.payment_plan,
                'amount': str(obj.assignment.amount),
                'currency': obj.assignment.currency,
                'class_level': dict(CLASS_LEVEL_CHOICES).get(obj.assignment.class_level, obj.assignment.class_level) if obj.assignment.class_level else None,
                'class_level_id': obj.assignment.class_level if obj.assignment.class_level else None,
                'class_level_details': {
                    'id': obj.assignment.class_level,
                    'name': dict(CLASS_LEVEL_CHOICES).get(obj.assignment.class_level, obj.assignment.class_level),
                    'level': obj.assignment.class_level,
                } if obj.assignment.class_level else None,
            }
        return None
    
    def get_currency_details(self, obj):
        from api.models.data.choices import CURRENCY_CHOICES
        if obj.currency:
            currency_name = dict(CURRENCY_CHOICES).get(obj.currency, obj.currency)
            return {'code': obj.currency, 'name': currency_name}
        return None
    
    def get_payment_date_shamsi(self, obj):
        """Get payment date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.payment_date).get('shamsi')
    
    def get_payment_date_qamari(self, obj):
        """Get payment date in Hijri Qamari calendar"""
        return get_calendar_info(obj.payment_date).get('qamari')
    
    def get_amount_str(self, obj):
        """Return amount as string for Decimal-safe output"""
        return str(obj.amount)
    
    # invoice allocation removed; payments are tracked against assignments
    
    def get_fee_type_details(self, obj):
        """Return fee type details if assigned"""
        if obj.fee_type:
            return {
                'id': obj.fee_type.id,
                'name': obj.fee_type.name,
                'code': obj.fee_type.code,
                'category': obj.fee_type.category,
            }
        return None
    
    def get_period_months(self, obj):
        """Return period_month as a list for compatibility"""
        if obj.period_month:
            return [str(obj.period_month).zfill(2)]
        return []
    
    def get_period_months(self, obj):
        """Return period_month as a list for compatibility"""
        if obj.period_month:
            return [str(obj.period_month).zfill(2)]
        return []
    
    def validate(self, attrs):
        amount = attrs.get('amount')
        if amount and amount <= 0:
            raise serializers.ValidationError({'amount': 'Payment amount must be greater than zero'})
        
        period_month = attrs.get('period_month')
        if period_month:
            try:
                m = int(period_month)
                if m < 1 or m > 12:
                    raise serializers.ValidationError({'period_month': 'Month must be between 1 and 12'})
            except ValueError:
                raise serializers.ValidationError({'period_month': 'Month must be a number between 1 and 12'})
        
        # FIXED: Convert empty fee_type string to None
        fee_type = attrs.get('fee_type')
        if fee_type == '' or fee_type == 'null' or fee_type == 'undefined':
            attrs['fee_type'] = None
        
        return attrs
    
    def create(self, validated_data):
        if validated_data.get('period_month'):
            validated_data['period_month'] = str(validated_data['period_month']).zfill(2)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        if validated_data.get('period_month'):
            validated_data['period_month'] = str(validated_data['period_month']).zfill(2)
        return super().update(instance, validated_data)


# Finance ledger removed — ledger entries are deprecated in the simplified payments flow


class FinanceLedgerSerializer(serializers.ModelSerializer):
    """Serializer for FinanceLedger model (minimal)"""
    class Meta:
        model = FinanceLedger
        fields = [
            'id', 'entry_type', 'reference_id', 'student', 'account', 'amount', 'currency',
            'entry_side', 'description', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class StudentPaymentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating payments with workflow:
    - Select student by level
    - Select fee assignments
    - Select months
    - Create payments
    """
    student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(),
        required=True
    )
    class_level = serializers.CharField(required=False, default='all')
    assignment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        min_length=1,
        error_messages={'empty': 'Select at least one fee assignment'}
    )
    period_year = serializers.CharField(required=False, default=lambda: str(timezone.now().year))
    period_months = serializers.ListField(
        child=serializers.CharField(),
        required=True,
        min_length=1,
        error_messages={'empty': 'Select at least one month'}
    )
    amount = serializers.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        required=False,
        min_value=Decimal('0.01')
    )
    payment_date = serializers.DateField(required=False, default=timezone.now().date)
    payment_status = serializers.ChoiceField(
        choices=StudentPayment.PAYMENT_STATUSES,
        required=False,
        default='completed'
    )
    currency = serializers.CharField(required=False, default='AFN')
    reference_number = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_assignment_ids(self, value):
        """Verify assignments exist and belong to the student"""
        student = self.initial_data.get('student')
        if student and value:
            assignments = StudentFeeAssignment.objects.filter(
                id__in=value,
                student_id=student,
                is_active=True
            )
            if assignments.count() != len(value):
                raise serializers.ValidationError("Some assignments not found or not active")
        return value
    
    def validate_period_months(self, value):
        """Validate month format"""
        norm_months = []
        for m in value:
            try:
                mi = int(m)
                if mi < 1 or mi > 12:
                    raise ValueError()
                norm_months.append(str(mi).zfill(2))
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Invalid month: {m}. Must be 1-12")
        return norm_months
    
    def validate(self, attrs):
        student = attrs.get('student')
        assignment_ids = attrs.get('assignment_ids')
        amount = attrs.get('amount')
        period_months = attrs.get('period_months')
        
        if not student or not assignment_ids:
            raise serializers.ValidationError({'student': 'Student and assignments are required'})
        
        # Get assignments for this student
        assignments = StudentFeeAssignment.objects.filter(
            id__in=assignment_ids,
            student=student,
            is_active=True
        ).select_related('fee_type')
        
        if len(assignments) != len(assignment_ids):
            raise serializers.ValidationError({'assignment_ids': 'Some assignments not found or not active'})
        
        # Validate payment_plan constraints
        months_count = len(period_months)
        for assignment in assignments:
            if assignment.payment_plan and months_count > assignment.payment_plan:
                raise serializers.ValidationError({
                    'period_months': f'Assignment for {assignment.fee_type.name} allows at most {assignment.payment_plan} month(s). You selected {months_count}.'
                })
        
        # Validate amount if provided
        if amount:
            total_remaining = Decimal('0')
            for assignment in assignments:
                paid = StudentPayment.completed().filter(
                    assignment=assignment,
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                remaining = (assignment.amount or Decimal('0')) - paid
                if remaining < 0:
                    remaining = Decimal('0')
                total_remaining += remaining
            
            if amount > total_remaining:
                raise serializers.ValidationError({
                    'amount': f'Payment amount ({amount}) exceeds total remaining balance ({total_remaining})'
                })
        
        return attrs