from rest_framework import serializers
from api.models.data.student import Student, ClassLevel
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class ClassLevelSerializer(DataRootSerializer):
    class Meta:
        model = ClassLevel
        fields = ['id', 'level', 'name', 'description', 'is_active', 'created_at', 'updated_at']


class StudentSerializer(DataRootSerializer):
    class_level_details = serializers.SerializerMethodField(read_only=True)
    financial_summary = serializers.SerializerMethodField(read_only=True)
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
            'class_level', 'payment_cycle', 'monthly_fee', 'yearly_fee', 'currency',
            'age', 'class_level_details', 'financial_summary', 'phone',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'age', 'class_level_details', 'financial_summary', 'phone',
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

    def get_financial_summary(self, obj):
        summary = obj.get_financial_summary()
        return {
            'total_payments': float(summary.get('total_payments', 0)),
            'remaining_balance': float(summary.get('remaining_balance', 0)),
            'payment_cycle': summary.get('payment_cycle'),
            'monthly_fee': float(summary.get('monthly_fee', 0)),
            'yearly_fee': float(summary.get('yearly_fee', 0)),
            'currency': summary.get('currency'),
            'registration_number': summary.get('registration_number'),
            'status': summary.get('status'),
            'class_level': summary.get('class_level'),
        }

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
