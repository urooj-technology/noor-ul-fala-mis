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
        """Get trial balance report with calendar support"""
        from api.services.accounting_service import AccountingService
        from api.utils.calendar import shamsi_to_gregorian, qamari_to_gregorian, parse_shamsi_date, parse_qamari_date
        
        as_of_date = request.query_params.get('as_of_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')
        
        # Convert date if needed
        if as_of_date and calendar_type in ['shamsi', 'qamari']:
            if calendar_type == 'shamsi':
                parsed = parse_shamsi_date(as_of_date)
                if parsed:
                    greg_date = shamsi_to_gregorian(*parsed)
                    as_of_date = greg_date.isoformat() if greg_date else None
            elif calendar_type == 'qamari':
                parsed = parse_qamari_date(as_of_date)
                if parsed:
                    greg_date = qamari_to_gregorian(*parsed)
                    as_of_date = greg_date.isoformat() if greg_date else None
        
        result = AccountingService.get_trial_balance(as_of_date)
        return Response(result)

    @action(detail=False, methods=['get'])
    def income_statement(self, request):
        """Get income statement (Profit & Loss) with calendar support"""
        from api.services.accounting_service import AccountingService
        from api.utils.calendar import shamsi_to_gregorian, qamari_to_gregorian, parse_shamsi_date, parse_qamari_date
        from django.utils import timezone
        from datetime import timedelta
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')
        
        # Default dates if not provided
        if not end_date:
            end_date = timezone.now().date()
        if not start_date:
            start_date = timezone.now().date() - timedelta(days=365)
        
        # Convert dates if needed
        if calendar_type in ['shamsi', 'qamari']:
            if calendar_type == 'shamsi':
                if start_date:
                    parsed = parse_shamsi_date(str(start_date))
                    if parsed:
                        greg_date = shamsi_to_gregorian(*parsed)
                        start_date = greg_date.isoformat() if greg_date else start_date
                if end_date:
                    parsed = parse_shamsi_date(str(end_date))
                    if parsed:
                        greg_date = shamsi_to_gregorian(*parsed)
                        end_date = greg_date.isoformat() if greg_date else end_date
            elif calendar_type == 'qamari':
                if start_date:
                    parsed = parse_qamari_date(str(start_date))
                    if parsed:
                        greg_date = qamari_to_gregorian(*parsed)
                        start_date = greg_date.isoformat() if greg_date else start_date
                if end_date:
                    parsed = parse_qamari_date(str(end_date))
                    if parsed:
                        greg_date = qamari_to_gregorian(*parsed)
                        end_date = greg_date.isoformat() if greg_date else end_date

        result = AccountingService.get_income_statement(str(start_date), str(end_date))
        return Response(result)

    @action(detail=False, methods=['get'])
    def balance_sheet(self, request):
        """Get balance sheet with calendar support"""
        from api.services.accounting_service import AccountingService
        from api.utils.calendar import shamsi_to_gregorian, qamari_to_gregorian, parse_shamsi_date, parse_qamari_date
        
        as_of_date = request.query_params.get('as_of_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')
        
        # Convert date if needed
        if as_of_date and calendar_type in ['shamsi', 'qamari']:
            if calendar_type == 'shamsi':
                parsed = parse_shamsi_date(as_of_date)
                if parsed:
                    greg_date = shamsi_to_gregorian(*parsed)
                    as_of_date = greg_date.isoformat() if greg_date else None
            elif calendar_type == 'qamari':
                parsed = parse_qamari_date(as_of_date)
                if parsed:
                    greg_date = qamari_to_gregorian(*parsed)
                    as_of_date = greg_date.isoformat() if greg_date else None
        
        result = AccountingService.get_balance_sheet(as_of_date)
        return Response(result)


class FiscalYearViewSet(DataRootViewSet):
    queryset = FiscalYear.objects.all().order_by('-start_date')
    serializer_class = FiscalYearSerializer
    filterset_fields = ['is_closed']
