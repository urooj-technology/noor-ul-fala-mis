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
    queryset = Account.objects.all().order_by('code')
    serializer_class = AccountSerializer
    filterset_fields = ['account_type', 'is_active', 'is_detail']
    search_fields = ['name', 'code']


class JournalEntryViewSet(DataRootViewSet):
    queryset = JournalEntry.objects.all().order_by('-date', '-id')
    serializer_class = JournalEntrySerializer
    filterset_fields = ['account', 'transaction', 'date']
    search_fields = ['description', 'reference']


class TransactionViewSet(DataRootViewSet):
    queryset = Transaction.objects.all().order_by('-date', '-id')
    serializer_class = TransactionSerializer
    filterset_fields = ['transaction_type', 'is_posted', 'date']
    search_fields = ['number', 'description', 'reference']

    def get_serializer_class(self):
        if self.action in ['create', 'update']:
            return TransactionCreateSerializer
        return TransactionSerializer

    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        """Get trial balance report"""
        from api.services.accounting_service import AccountingService
        as_of_date = request.query_params.get('as_of_date')
        result = AccountingService.get_trial_balance(as_of_date)
        return Response(result)

    @action(detail=False, methods=['get'])
    def income_statement(self, request):
        """Get income statement (Profit & Loss)"""
        from api.services.accounting_service import AccountingService
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            from django.utils import timezone
            from datetime import timedelta
            end_date = end_date or timezone.now().date()
            start_date = start_date or (end_date - timedelta(days=365)).strftime('%Y-%m-%d')

        result = AccountingService.get_income_statement(start_date, end_date)
        return Response(result)

    @action(detail=False, methods=['get'])
    def balance_sheet(self, request):
        """Get balance sheet"""
        from api.services.accounting_service import AccountingService
        as_of_date = request.query_params.get('as_of_date')
        result = AccountingService.get_balance_sheet(as_of_date)
        return Response(result)


class FiscalYearViewSet(DataRootViewSet):
    queryset = FiscalYear.objects.all().order_by('-start_date')
    serializer_class = FiscalYearSerializer
    filterset_fields = ['is_closed']
