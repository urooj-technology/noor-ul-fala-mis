from rest_framework import serializers
from api.models.data.expenses import Expense, ExpenseCategory
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info

class ExpenseCategorySerializer(DataRootSerializer):
    class Meta:
        model = ExpenseCategory
        fields = "__all__"

class ExpenseSerializer(DataRootSerializer):
    category_details = serializers.SerializerMethodField()

    user_details = serializers.SerializerMethodField()
    currency_details = serializers.SerializerMethodField()
    # Calendar date fields
    expense_date_shamsi = serializers.SerializerMethodField(read_only=True)
    expense_date_qamari = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Expense
        fields = "__all__"
    
    def get_category_details(self, obj):
        if obj.category:
            return {
                "id": obj.category.id,
                "name": obj.category.name
            }
        return None
    

    
    def get_user_details(self, obj):
        if obj.user:
            return {
                "id": obj.user.id,
                "fullname": f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip(),
                "username": obj.user.username,
                "email": obj.user.email
            }
        return None
    
    def get_currency_details(self, obj):
        from api.models.data.choices import CURRENCY_CHOICES
        if obj.currency:
            currency_name = dict(CURRENCY_CHOICES).get(obj.currency, obj.currency)
            return {
                "code": obj.currency,
                "name": currency_name
            }
        return None

    def get_expense_date_shamsi(self, obj):
        """Get expense date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.expense_date).get('shamsi')

    def get_expense_date_qamari(self, obj):
        """Get expense date in Hijri Qamari calendar"""
        return get_calendar_info(obj.expense_date).get('qamari')