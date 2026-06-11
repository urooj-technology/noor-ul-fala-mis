from django.contrib import admin
from api.models.data.expenses import Expense, ExpenseCategory
from api.models.data.employee import Employee
from api.models.data.payroll import Payroll
from api.models.data.advance import Advance
from api.models.data.activity_log import ActivityLog
from api.models.data.student import Student, ClassLevel
from api.models.data.student_finance import (
    StudentPayment, StudentFeeAssignment,
    FeeType, FinanceLedger
)


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ['level', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'level']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['registration_number', 'full_name', 'class_level', 'payment_interval_months', 'payment_interval_display', 'status']
    list_filter = ['status', 'class_level', 'payment_interval_months']
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
            'fields': ('class_level', 'payment_interval_months', 'monthly_fee', 'yearly_fee', 'currency')
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


@admin.register(FinanceLedger)
class FinanceLedgerAdmin(admin.ModelAdmin):
    list_display = ['student', 'entry_type', 'account', 'amount', 'entry_side', 'created_at']
    list_filter = ['entry_type', 'account', 'entry_side', 'created_at']
    search_fields = ['student__full_name', 'student__registration_number', 'account']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['category', 'amount', 'get_currency_info', 'expense_date', 'get_user_info']
    list_filter = ['category', 'currency', 'expense_date']
    search_fields = ['category__name', 'description', 'user__username', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']

    def get_currency_info(self, obj):
        return obj.currency if obj.currency else "-"
    get_currency_info.short_description = 'Currency'

    def get_user_info(self, obj):
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.username
        return "-"
    get_user_info.short_description = 'User'


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    list_filter = []
    search_fields = ['name', 'description']


admin.site.register(Employee)
admin.site.register(Payroll)
admin.site.register(Advance)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model_name', 'object_id', 'created_at']
    list_filter = ['action', 'model_name', 'created_at']
    search_fields = ['description', 'user__username', 'user__email']
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'description', 'ip_address', 'user_agent', 'changes', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False