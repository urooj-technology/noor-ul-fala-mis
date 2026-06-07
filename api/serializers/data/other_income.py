from rest_framework import serializers
from api.models.data.other_income import OtherIncome, IncomeCategory
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class IncomeCategorySerializer(DataRootSerializer):
    class Meta:
        model = IncomeCategory
        fields = ['id', 'name', 'category_type', 'description', 'is_active', 'created_at', 'updated_at']


class OtherIncomeSerializer(DataRootSerializer):
    income_category_details = serializers.SerializerMethodField()
    currency_details = serializers.SerializerMethodField()
    # Calendar date fields
    income_date_shamsi = serializers.SerializerMethodField(read_only=True)
    income_date_qamari = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = OtherIncome
        fields = [
            'id', 'income_category', 'amount', 'currency', 'income_date', 
            'income_date_shamsi', 'income_date_qamari',
            'source', 'description', 'receipt',
            'income_category_details', 'currency_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['currency_details', 'income_date_shamsi', 'income_date_qamari']
    
    def get_income_category_details(self, obj):
        if obj.income_category:
            return {
                'id': obj.income_category.id,
                'name': obj.income_category.name,
                'category_type': obj.income_category.category_type
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

    def get_income_date_shamsi(self, obj):
        """Get income date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.income_date).get('shamsi')

    def get_income_date_qamari(self, obj):
        """Get income date in Hijri Qamari calendar"""
        return get_calendar_info(obj.income_date).get('qamari')

    def validate(self, attrs):
        # Validate amount
        amount = attrs.get('amount')
        if amount and amount <= 0:
            raise serializers.ValidationError({
                'amount': 'Income amount must be greater than zero'
            })
        
        return attrs
