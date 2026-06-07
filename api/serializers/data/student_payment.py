from rest_framework import serializers
from api.models.data.student_payment import StudentPayment
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class StudentPaymentSerializer(DataRootSerializer):
    student_details = serializers.SerializerMethodField()
    currency_details = serializers.SerializerMethodField()
    # Calendar date fields
    payment_date_shamsi = serializers.SerializerMethodField(read_only=True)
    payment_date_qamari = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StudentPayment
        fields = [
            'id', 'student', 'amount', 'currency', 'payment_date',
            'payment_status', 'payment_cycle', 'period_year', 'period_month',
            'reference_number', 'description', 'receipt',
            'student_details', 'currency_details',
            'payment_date_shamsi', 'payment_date_qamari',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['reference_number', 'currency_details', 'payment_date_shamsi', 'payment_date_qamari']

    def get_student_details(self, obj):
        if obj.student:
            return {
                'id': obj.student.id,
                'full_name': obj.student.full_name,
                'registration_number': obj.student.registration_number,
                'phone': obj.student.student_phone,
                'payment_cycle': obj.student.payment_cycle,
                'currency': obj.student.currency,
                'monthly_fee': float(obj.student.monthly_fee),
                'yearly_fee': float(obj.student.yearly_fee),
                'class_level': obj.student.class_level.name if obj.student.class_level else None,
            }
        return None

    def get_currency_details(self, obj):
        from api.models.data.choices import CURRENCY_CHOICES
        if obj.currency:
            currency_name = dict(CURRENCY_CHOICES).get(obj.currency, obj.currency)
            return {
                'code': obj.currency,
                'name': currency_name
            }
        return None

    def get_payment_date_shamsi(self, obj):
        """Get payment date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.payment_date).get('shamsi')

    def get_payment_date_qamari(self, obj):
        """Get payment date in Hijri Qamari calendar"""
        return get_calendar_info(obj.payment_date).get('qamari')

    def validate(self, attrs):
        # Validate payment amount
        amount = attrs.get('amount')
        if amount and amount <= 0:
            raise serializers.ValidationError({
                'amount': 'Payment amount must be greater than zero'
            })

        # If period_month is set ensure it is 1-12
        period_month = attrs.get('period_month')
        if period_month:
            try:
                m = int(period_month)
                if m < 1 or m > 12:
                    raise serializers.ValidationError({'period_month': 'Month must be between 1 and 12'})
            except ValueError:
                raise serializers.ValidationError({'period_month': 'Month must be a number between 1 and 12'})

        return attrs

    def create(self, validated_data):
        # Ensure period_month is zero-padded
        if validated_data.get('period_month'):
            validated_data['period_month'] = str(validated_data['period_month']).zfill(2)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Ensure period_month is zero-padded
        if validated_data.get('period_month'):
            validated_data['period_month'] = str(validated_data['period_month']).zfill(2)
        return super().update(instance, validated_data)
