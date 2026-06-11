"""
Fee Serializers - All fee-related serializers in one file
Includes: FeeType, ClassFee, StudentFeeAssignment, PaymentPlan

فارسی: سریالایزرهای فیس - همه سریالایزرهای مربوط به فیس در یک فایل
"""
from rest_framework import serializers
from decimal import Decimal
from api.models.data.fee import FeeType, StudentFeeAssignment
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class FeeTypeSerializer(DataRootSerializer):
    """Serializer for FeeType model"""
    
    display_name = serializers.SerializerMethodField()
    display_description = serializers.SerializerMethodField()
    
    class Meta:
        model = FeeType
        fields = [
            'id', 'name', 'name_fa', 'name_ps', 'display_name',
            'code', 'category', 'description', 'description_fa', 'description_ps',
            'display_description', 'is_active', 'is_mandatory',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_display_name(self, obj):
        """Get name based on request language"""
        lang = self.context.get('request').query_params.get('lang', 'en') if self.context.get('request') else 'en'
        return obj.get_display_name(lang)
    
    def get_display_description(self, obj):
        """Get description based on request language"""
        lang = self.context.get('request').query_params.get('lang', 'en') if self.context.get('request') else 'en'
        return obj.get_description(lang)


class FeeTypeMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for FeeType (for nested use)"""
    
    class Meta:
        model = FeeType
        fields = ['id', 'name', 'name_fa', 'name_ps', 'code', 'category']




class StudentFeeAssignmentSerializer(DataRootSerializer):
    """Serializer for StudentFeeAssignment model"""
    
    fee_type_details = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_registration = serializers.CharField(source='student.registration_number', read_only=True)
    
    class Meta:
        model = StudentFeeAssignment
        fields = [
            'id', 'student', 'student_name', 'student_registration',
            'fee_type', 'fee_type_details', 'amount', 'currency',
            'is_mandatory', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_fee_type_details(self, obj):
        if obj.fee_type:
            return FeeTypeMinimalSerializer(obj.fee_type).data
        return None
