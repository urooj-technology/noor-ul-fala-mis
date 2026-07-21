from rest_framework.decorators import action
from rest_framework.response import Response
from api.models.data.expenses import Expense, ExpenseCategory
from api.serializers.data.expenses import ExpenseSerializer, ExpenseCategorySerializer
from api.views.data.base import DataRootViewSet
from api.permissions import user_is_admin
from api.services.payment_report import build_payment_report
from api.utils.registration_dates import get_registration_date_range


class ExpenseCategoryViewSet(DataRootViewSet):
    permission_module = 'expenses'
    queryset = ExpenseCategory.objects.all().order_by("-id")
    serializer_class = ExpenseCategorySerializer
    filterset_fields = []
    search_fields = ["name"]


class ExpenseViewSet(DataRootViewSet):
    permission_module = 'expenses'
    queryset = Expense.objects.select_related('category', 'user').all().order_by("-expense_date", "-id")
    serializer_class = ExpenseSerializer
    filterset_fields = ["category", "user"]
    search_fields = ["description", "receipt"]

    def get_required_permission(self):
        if self.action == 'payment_report':
            return 'view_expenses'
        return super().get_required_permission()

    def get_queryset(self):
        queryset = super().get_queryset()
        date_period = self.request.query_params.get('date_period')
        if date_period:
            date_from = self.request.query_params.get('date_from')
            date_to = self.request.query_params.get('date_to')
            range_start, range_end = get_registration_date_range(
                date_period, date_from, date_to
            )
            if range_start and range_end:
                queryset = queryset.filter(
                    expense_date__gte=range_start,
                    expense_date__lte=range_end,
                )
            elif date_period == 'custom':
                queryset = queryset.none()
        return queryset

    def list(self, request, *args, **kwargs):
        if request.query_params.get('date_period'):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'count': queryset.count(),
                'results': serializer.data,
            })
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='payment-report')
    def payment_report(self, request):
        """Merged payroll, advance, and expense payments for a date period."""
        user = request.user
        include_payroll = user_is_admin(user) or user.has_permission('view_payroll')
        include_advance = user_is_admin(user) or user.has_permission('view_advances')
        include_expense = user_is_admin(user) or user.has_permission('view_expenses')

        date_period = request.query_params.get('date_period')
        if not date_period:
            return Response({'error': 'date_period is required'}, status=400)

        rows, summary = build_payment_report(
            date_period=date_period,
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
            employee=request.query_params.get('employee'),
            position=request.query_params.get('position'),
            category=request.query_params.get('category'),
            user=request.query_params.get('user'),
            payment_type=request.query_params.get('payment_type'),
            search=request.query_params.get('search'),
            include_payroll=include_payroll,
            include_advance=include_advance,
            include_expense=include_expense,
        )

        return Response({
            'count': summary['count'],
            'results': rows,
            'summary': summary,
        })

    def perform_create(self, serializer):
        """Create expense - journal entry created automatically by signal"""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """Update expense"""
        serializer.save()
