from api.models.data.expenses import Expense, ExpenseCategory
from api.serializers.data.expenses import ExpenseSerializer, ExpenseCategorySerializer
from api.views.data.base import DataRootViewSet

class ExpenseCategoryViewSet(DataRootViewSet):
    permission_module = 'expenses'
    queryset = ExpenseCategory.objects.all().order_by("-id")
    serializer_class = ExpenseCategorySerializer
    filterset_fields = []
    search_fields = ["name"]

class ExpenseViewSet(DataRootViewSet):
    permission_module = 'expenses'
    queryset = Expense.objects.all().order_by("-id")
    serializer_class = ExpenseSerializer
    filterset_fields = ["category", "user"]
    search_fields = ["description", "receipt"]
    
    def perform_create(self, serializer):
        """Create expense - journal entry created automatically by signal"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """Update expense"""
        # Note: Journal entries are not updated automatically to maintain audit trail
        serializer.save()