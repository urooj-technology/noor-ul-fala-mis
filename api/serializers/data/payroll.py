from rest_framework import serializers
from api.models.data.payroll import Payroll
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info, shamsi_period_from_payment_date

class PayrollSerializer(DataRootSerializer):
    employee_details = serializers.SerializerMethodField()
    currency_details = serializers.SerializerMethodField()
    period_summary = serializers.SerializerMethodField(read_only=True)
    total_payroll_paid = serializers.SerializerMethodField(read_only=True)
    total_advance_paid = serializers.SerializerMethodField(read_only=True)
    # Calendar date fields
    payment_date_shamsi = serializers.SerializerMethodField(read_only=True)
    payment_date_qamari = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Payroll
        fields = "__all__"
    
    def get_employee_details(self, obj):
        if obj.employee:
            return {
                "id": obj.employee.id,
                "full_name": obj.employee.full_name,
                "position": obj.employee.position,
                "phone": obj.employee.phone,
                "salary": obj.employee.salary
            }
        return None

    def get_period_summary(self, obj):
        if not obj.employee:
            return None
        return obj.employee.get_period_financial_summary(obj.month, obj.year)

    def get_total_payroll_paid(self, obj):
        if not obj.employee:
            return 0
        return float(obj.employee.get_total_salary_paid())

    def get_total_advance_paid(self, obj):
        if not obj.employee:
            return 0
        return float(obj.employee.get_total_advances_paid())
    
    def get_currency_details(self, obj):
        from api.models.data.choices import CURRENCY_CHOICES
        if obj.currency:
            currency_name = dict(CURRENCY_CHOICES).get(obj.currency, obj.currency)
            return {
                "code": obj.currency,
                "name": currency_name
            }
        return None

    def get_payment_date_shamsi(self, obj):
        """Get payment date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.payment_date).get('shamsi')

    def get_payment_date_qamari(self, obj):
        """Get payment date in Hijri Qamari calendar"""
        return get_calendar_info(obj.payment_date).get('qamari')

    def create(self, validated_data):
        period = shamsi_period_from_payment_date(validated_data.get('payment_date'))
        if period:
            validated_data['month'], validated_data['year'] = period
        return super().create(validated_data)

    def update(self, instance, validated_data):
        payment_date = validated_data.get('payment_date', instance.payment_date)
        period = shamsi_period_from_payment_date(payment_date)
        if period:
            validated_data['month'], validated_data['year'] = period
        return super().update(instance, validated_data)