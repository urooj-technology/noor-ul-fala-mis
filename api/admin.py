from django.contrib import admin
from api.models.data.expenses import Expense, ExpenseCategory
from api.models.data.employee import Employee
from api.models.data.payroll import Payroll
from api.models.data.advance import Advance
from api.models.data.activity_log import ActivityLog
from api.models.data.student import Student
from api.models.data.student_finance import (
    StudentPayment, StudentFeeAssignment,
    FeeType
)


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['registration_number', 'full_name', 'class_level', 'status']
    list_filter = ['status', 'class_level']
    search_fields = ['full_name', 'father_name', 'registration_number', 'tazkira_number']
    readonly_fields = ['created_at', 'updated_at', 'registration_date']
    fieldsets = (
        ('Personal Information', {
            'fields': ('full_name', 'father_name', 'grandfather_name', 'date_of_birth', 'gender', 'tazkira_number', 'photo')
        }),
        ('Address Information', {
            'fields': ('permanent_address', 'current_address', 'province', 'district', 'area')
        }),
        ('Contact Information', {
            'fields': ('parent_phone', 'student_phone', 'alternative_phone', 'email')
        }),
        ('Registration Information', {
            'fields': ('registration_number', 'registration_date', 'status', 'transportation')
        }),
        ('Academic & Fee Information', {
            'fields': ('class_level',)
        }),
        ('Documents', {
            'fields': ('tazkira_copy', 'parent_tazkira_copy', 'previous_result_card', 'payment_receipt')
        }),
    )


@admin.register(FeeType)
class FeeTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category', 'is_active', 'is_mandatory']
    list_filter = ['is_active', 'is_mandatory', 'category']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(StudentFeeAssignment)
class StudentFeeAssignmentAdmin(admin.ModelAdmin):
    list_display = ['student', 'fee_type', 'amount', 'currency', 'is_active', 'is_mandatory']
    list_filter = ['is_active', 'is_mandatory', 'fee_type']
    search_fields = ['student__full_name', 'student__registration_number', 'fee_type__name']



@admin.register(StudentPayment)
class StudentPaymentAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'assignment', 'amount', 'payment_status', 'payment_date']
    list_filter = ['payment_status', 'payment_date']
    search_fields = ['reference_number', 'assignment__student__full_name', 'description']
    readonly_fields = ['reference_number', 'created_at', 'updated_at']


