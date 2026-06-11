from rest_framework import serializers
from decimal import Decimal
from api.models.data.student import Student, ClassLevel
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class ClassLevelSerializer(DataRootSerializer):
    class Meta:
        model = ClassLevel
        fields = ['id', 'level', 'name', 'description', 'is_active', 'created_at', 'updated_at']


class StudentSerializer(DataRootSerializer):
    class_level_details = serializers.SerializerMethodField(read_only=True)
    total_paid = serializers.SerializerMethodField(read_only=True)
    remaining_balance = serializers.SerializerMethodField(read_only=True)
    phone = serializers.CharField(source='parent_phone', read_only=True)
    # Calendar date fields
    date_of_birth_shamsi = serializers.SerializerMethodField(read_only=True)
    date_of_birth_qamari = serializers.SerializerMethodField(read_only=True)
    registration_date_shamsi = serializers.SerializerMethodField(read_only=True)
    registration_date_qamari = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'full_name', 'father_name', 'grandfather_name', 'date_of_birth',
            'date_of_birth_shamsi', 'date_of_birth_qamari',
            'gender', 'tazkira_number', 'permanent_address', 'current_address',
            'province', 'district', 'area', 'parent_phone', 'student_phone',
            'alternative_phone', 'email', 'registration_number', 'registration_date',
            'registration_date_shamsi', 'registration_date_qamari',
            'status', 'transportation', 'photo', 'tazkira_copy',
            'parent_tazkira_copy', 'previous_result_card', 'payment_receipt',
            'class_level', 'payment_interval_months', 'payment_interval_display',
            'currency',
            'age', 'class_level_details', 'total_paid', 'remaining_balance', 'phone',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'age', 'class_level_details', 'total_paid', 'remaining_balance', 'phone',
            'date_of_birth_shamsi', 'date_of_birth_qamari',
            'registration_date_shamsi', 'registration_date_qamari'
        ]

    def get_class_level_details(self, obj):
        if obj.class_level:
            return {
                'id': obj.class_level.id,
                'level': obj.class_level.level,
                'name': obj.class_level.name,
            }
        return None

    def get_total_paid(self, obj):
        """Get total paid amount from StudentPayment"""
        total = obj.get_total_payments()
        def decimal_to_str(val):
            if isinstance(val, str):
                return val
            return str(val)
        return decimal_to_str(total)

    def get_remaining_balance(self, obj):
        """Get remaining balance"""
        expected = obj.effective_fee
        total_paid = obj.get_total_payments()
        remaining = max(expected - total_paid, Decimal('0'))
        def decimal_to_str(val):
            if isinstance(val, str):
                return val
            return str(val)
        return decimal_to_str(remaining)

    def get_date_of_birth_shamsi(self, obj):
        """Get date of birth in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.date_of_birth).get('shamsi')

    def get_date_of_birth_qamari(self, obj):
        """Get date of birth in Hijri Qamari calendar"""
        return get_calendar_info(obj.date_of_birth).get('qamari')

    def get_registration_date_shamsi(self, obj):
        """Get registration date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.registration_date).get('shamsi')

    def get_registration_date_qamari(self, obj):
        """Get registration date in Hijri Qamari calendar"""
        return get_calendar_info(obj.registration_date).get('qamari')

    def validate(self, attrs):
        # Validate registration number uniqueness
        registration_number = attrs.get('registration_number')
        instance = self.instance

        if registration_number:
            query = Student.objects.filter(registration_number=registration_number)
            if instance:
                query = query.exclude(id=instance.id)
            if query.exists():
                raise serializers.ValidationError({
                    'registration_number': 'This registration number already exists'
                })

        # Validate tazkira number uniqueness
        tazkira_number = attrs.get('tazkira_number')
        if tazkira_number:
            query = Student.objects.filter(tazkira_number=tazkira_number)
            if instance:
                query = query.exclude(id=instance.id)
            if query.exists():
                raise serializers.ValidationError({
                    'tazkira_number': 'This Tazkira number already exists'
                })

        return attrs