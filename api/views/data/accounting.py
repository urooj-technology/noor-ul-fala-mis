from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from api.views.data.base import DataRootViewSet
from api.models.data.accounting import (
    Account, JournalEntry, Transaction, FiscalYear
)
from api.serializers.data.accounting import (
    AccountSerializer, JournalEntrySerializer,
    TransactionSerializer, TransactionCreateSerializer, FiscalYearSerializer
)


class AccountViewSet(DataRootViewSet):
    permission_module = 'accounting'
    queryset = Account.objects.all().order_by('code')
    serializer_class = AccountSerializer
    filterset_fields = ['account_type', 'is_active', 'is_detail']
    search_fields = ['name', 'code']


class JournalEntryViewSet(DataRootViewSet):
    permission_module = 'accounting'
    queryset = JournalEntry.objects.all().order_by('-date', '-id')
    serializer_class = JournalEntrySerializer
    filterset_fields = ['account', 'transaction', 'date']
    search_fields = ['description', 'reference']

    def get_required_permission(self):
        if self.action == 'create':
            return 'create_journal_entries'
        if self.action in ('update', 'partial_update', 'destroy'):
            return 'edit_journal_entries'
        if self.action in ('list', 'retrieve'):
            return 'view_accounting'
        return super().get_required_permission()


class TransactionViewSet(DataRootViewSet):
    permission_module = 'accounting'
    queryset = Transaction.objects.all().order_by('-date', '-id')
    serializer_class = TransactionSerializer
    filterset_fields = ['transaction_type', 'is_posted', 'date']
    search_fields = ['number', 'description', 'reference']

    def get_serializer_class(self):
        if self.action in ['create', 'update']:
            return TransactionCreateSerializer
        return TransactionSerializer

    def perform_destroy(self, instance):
        user = self.request.user
        for entry in instance.entries.filter(is_deleted=False):
            entry.soft_delete(user=user)
        instance.soft_delete(user=user)

    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        """Get trial balance report with calendar support"""
        from api.services.accounting_service import AccountingService
        from api.utils.calendar import to_gregorian_date_str

        as_of_date = request.query_params.get('as_of_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')
        as_of_date = to_gregorian_date_str(as_of_date, calendar_type)

        result = AccountingService.get_trial_balance(as_of_date)
        return Response(result)

    @action(detail=False, methods=['get'])
    def income_statement(self, request):
        """Get income statement (Profit & Loss) with calendar support"""
        from api.services.accounting_service import AccountingService
        from api.utils.calendar import to_gregorian_date_str
        from django.utils import timezone
        from datetime import timedelta

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')

        if not end_date:
            end_date = timezone.now().date().isoformat()
        if not start_date:
            start_date = (timezone.now().date() - timedelta(days=365)).isoformat()

        start_date = to_gregorian_date_str(start_date, calendar_type)
        end_date = to_gregorian_date_str(end_date, calendar_type)

        result = AccountingService.get_income_statement(start_date, end_date)
        return Response(result)

    @action(detail=False, methods=['get'])
    def balance_sheet(self, request):
        """Get balance sheet with calendar support"""
        from api.services.accounting_service import AccountingService
        from api.utils.calendar import to_gregorian_date_str

        as_of_date = request.query_params.get('as_of_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')
        as_of_date = to_gregorian_date_str(as_of_date, calendar_type)

        result = AccountingService.get_balance_sheet(as_of_date)
        return Response(result)


class FiscalYearViewSet(DataRootViewSet):
    permission_module = 'accounting'
    queryset = FiscalYear.objects.all().order_by('-start_date')
    serializer_class = FiscalYearSerializer
    filterset_fields = ['is_closed']
