from django.urls import path, include
from rest_framework import routers
from api.views.data.base import DataRootViewSet

# ====================== HR MANAGEMENT ======================
from api.views.data.employee import EmployeeViewSet
from api.views.data.payroll import PayrollViewSet
from api.views.data.advance import AdvanceViewSet

# ====================== STUDENT MANAGEMENT ======================
from api.views.data.student import StudentViewSet

# ====================== STUDENT FINANCE (FEE) ======================
from api.views.data.student_finance import (
    FeeTypeViewSet,
    StudentFeeAssignmentViewSet,
    StudentPaymentViewSet,
)

# ====================== SHOP RENTAL ======================
from api.views.data.shop_rental import ShopViewSet, TenantViewSet, ShopRentalViewSet
from api.views.data.shop_rental_payment import ShopRentalPaymentViewSet

# ====================== OTHER INCOME ======================
from api.views.data.other_income import OtherIncomeViewSet, IncomeCategoryViewSet

# ====================== EXPENSES ======================
from api.views.data.expenses import ExpenseViewSet, ExpenseCategoryViewSet

# ====================== PERMISSIONS ======================
from api.views.data.permissions import PermissionViewSet, UserPermissionViewSet

# ====================== ACTIVITY LOGS ======================
from api.views.data.activity_log import ActivityLogViewSet

# ====================== ACCOUNTING ======================
from api.views.data.accounting import (
    AccountViewSet, JournalEntryViewSet,
    TransactionViewSet, FiscalYearViewSet
)

# ====================== REPORTS ======================
from api.views.reports import FinancialReportView
from api.views.comprehensive_reports import ComprehensiveReportView, DailyReportView
from api.views.deleted_items import DeletedItemsView, DeletedItemsRestoreView


# Create a router and register your viewsets with it
class OptionalSlashRouter(routers.DefaultRouter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = '/?'

router = OptionalSlashRouter()

# ====================== REGISTER ALL VIEWSETS ======================

# HR Management
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'payrolls', PayrollViewSet, basename='payroll')
router.register(r'advances', AdvanceViewSet, basename='advance')

# Student Management
router.register(r'students', StudentViewSet, basename='student')
router.register(r'student-payments', StudentPaymentViewSet, basename='student-payment')

# Student Finance (Fee)
router.register(r'fee-types', FeeTypeViewSet, basename='fee-type')
router.register(r'student-fee-assignments', StudentFeeAssignmentViewSet, basename='student-fee-assignment')

# Shop Rental
router.register(r'shops', ShopViewSet, basename='shop')
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'shop-rentals', ShopRentalViewSet, basename='shop-rental')
router.register(r'shop-rental-payments', ShopRentalPaymentViewSet, basename='shop-rental-payment')

# Other Income
router.register(r'income-categories', IncomeCategoryViewSet, basename='income-category')
router.register(r'other-incomes', OtherIncomeViewSet, basename='other-income')

# Expenses
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expenses', ExpenseViewSet, basename='expense')

# Permissions
router.register(r'permissions', PermissionViewSet, basename='permission')
router.register(r'users/(?P<user_id>[^/.]+)/permissions', UserPermissionViewSet, basename='user-permission')

# Activity Logs
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')

# Accounting
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'journal-entries', JournalEntryViewSet, basename='journal-entry')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'fiscal-years', FiscalYearViewSet, basename='fiscal-year')


urlpatterns = [
    path("", include(router.urls)),
    path("reports/financial/", FinancialReportView.as_view(), name='financial-report'),
    path("reports/comprehensive/", ComprehensiveReportView.as_view(), name='comprehensive-report'),
    path("reports/daily/", DailyReportView.as_view(), name='daily-report'),
    path("deleted-items/", DeletedItemsView.as_view(), name='deleted-items'),
    path("deleted-items/restore/", DeletedItemsRestoreView.as_view(), name='deleted-items-restore'),
]