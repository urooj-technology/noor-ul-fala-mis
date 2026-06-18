from rest_framework import serializers
from api.serializers.data.base import DataRootSerializer
from api.models.data.accounting import (
    Account, JournalEntry, Transaction, FiscalYear, AccountType
)
from api.utils.calendar import get_calendar_info
from decimal import Decimal
from django.db.models import Sum


class AccountSerializer(DataRootSerializer):
    account_type_display = serializers.CharField(source='get_account_type_display', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    current_balance = serializers.SerializerMethodField()
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = ['id', 'name', 'code', 'account_type', 'account_type_display',
                  'parent', 'parent_name', 'is_active', 'is_detail', 'balance',
                  'current_balance', 'total_debit', 'total_credit', 'currency',
                  'created_at', 'updated_at']

    def get_current_balance(self, obj):
        return float(obj.get_balance())

    def get_total_debit(self, obj):
        total = obj.journal_entries.filter(
            is_deleted=False, transaction__is_deleted=False
        ).aggregate(total=Sum('debit'))['total'] or Decimal('0')
        return float(total)

    def get_total_credit(self, obj):
        total = obj.journal_entries.filter(
            is_deleted=False, transaction__is_deleted=False
        ).aggregate(total=Sum('credit'))['total'] or Decimal('0')
        return float(total)


class JournalEntrySerializer(DataRootSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    transaction_number = serializers.CharField(source='transaction.number', read_only=True)
    # Calendar date fields
    date_shamsi = serializers.SerializerMethodField(read_only=True)
    date_qamari = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = JournalEntry
        fields = ['id', 'date', 'date_shamsi', 'date_qamari', 'account', 'account_code', 'account_name', 'debit', 'credit',
                  'description', 'reference', 'transaction', 'transaction_number',
                  'created_at', 'updated_at']

    def get_date_shamsi(self, obj):
        return get_calendar_info(obj.date).get('shamsi')

    def get_date_qamari(self, obj):
        return get_calendar_info(obj.date).get('qamari')


class JournalEntryCreateSerializer(DataRootSerializer):
    """Serializer for creating journal entries within a transaction (no transaction field required)"""
    class Meta:
        model = JournalEntry
        fields = ['account', 'debit', 'credit', 'description', 'reference']


class TransactionSerializer(DataRootSerializer):
    total_debit = serializers.ReadOnlyField()
    total_credit = serializers.ReadOnlyField()
    is_balanced = serializers.ReadOnlyField()
    entries = JournalEntrySerializer(many=True, read_only=True)
    # Calendar date fields
    date_shamsi = serializers.SerializerMethodField(read_only=True)
    date_qamari = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'number', 'date', 'date_shamsi', 'date_qamari', 'description', 'transaction_type',
                  'reference', 'is_posted', 'posted_at', 'total_debit', 'total_credit',
                  'is_balanced', 'entries', 'created_at', 'updated_at']

    def get_date_shamsi(self, obj):
        return get_calendar_info(obj.date).get('shamsi')

    def get_date_qamari(self, obj):
        return get_calendar_info(obj.date).get('qamari')


class TransactionCreateSerializer(DataRootSerializer):
    entries = JournalEntryCreateSerializer(many=True)
    # Calendar date fields
    date_shamsi = serializers.SerializerMethodField(read_only=True)
    date_qamari = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'number', 'date', 'date_shamsi', 'date_qamari', 'description', 'transaction_type',
                  'reference', 'is_posted', 'entries']

    def get_date_shamsi(self, obj):
        return get_calendar_info(obj.date).get('shamsi')

    def get_date_qamari(self, obj):
        return get_calendar_info(obj.date).get('qamari')

    def validate(self, data):
        entries = data.get('entries', [])
        total_debit = sum(Decimal(str(line.get('debit', 0))) for line in entries)
        total_credit = sum(Decimal(str(line.get('credit', 0))) for line in entries)

        if abs(total_debit - total_credit) > Decimal('0.01'):
            raise serializers.ValidationError(
                f"Transaction is not balanced. Debit: {total_debit}, Credit: {total_credit}"
            )
        return data

    def create(self, validated_data):
        entries_data = validated_data.pop('entries')
        transaction = Transaction.objects.create(**validated_data)

        for entry_data in entries_data:
            account = entry_data['account']
            # If account is already an Account object, use it directly
            if isinstance(account, Account):
                account_obj = account
            else:
                account_obj = Account.objects.get(id=account)
            
            JournalEntry.objects.create(
                date=transaction.date,
                account=account_obj,
                debit=Decimal(str(entry_data.get('debit', 0))),
                credit=Decimal(str(entry_data.get('credit', 0))),
                description=entry_data.get('description') or validated_data.get('description'),
                reference=entry_data.get('reference') or validated_data.get('reference'),
                transaction=transaction
            )

        return transaction


class FiscalYearSerializer(DataRootSerializer):
    # Calendar date fields
    start_date_shamsi = serializers.SerializerMethodField(read_only=True)
    end_date_shamsi = serializers.SerializerMethodField(read_only=True)
    start_date_qamari = serializers.SerializerMethodField(read_only=True)
    end_date_qamari = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FiscalYear
        fields = ['id', 'name', 'start_date', 'start_date_shamsi', 'start_date_qamari', 
                  'end_date', 'end_date_shamsi', 'end_date_qamari', 'is_closed',
                  'created_at', 'updated_at']

    def get_start_date_shamsi(self, obj):
        return get_calendar_info(obj.start_date).get('shamsi')

    def get_end_date_shamsi(self, obj):
        return get_calendar_info(obj.end_date).get('shamsi')

    def get_start_date_qamari(self, obj):
        return get_calendar_info(obj.start_date).get('qamari')

    def get_end_date_qamari(self, obj):
        return get_calendar_info(obj.end_date).get('qamari')
