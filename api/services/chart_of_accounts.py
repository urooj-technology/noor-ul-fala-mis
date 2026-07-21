"""Ensure the standard chart of accounts exists (idempotent)."""

from datetime import date

from django.db import transaction

from api.models.data.accounting import Account, AccountType, FiscalYear
from api.models.data.choices import CURRENCY_CHOICES

STANDARD_CURRENCIES = ('AFN', 'USD')


def get_standard_accounts_for_currency(currency: str) -> list[dict]:
    """Return the default chart-of-accounts rows for one currency."""
    return [
        # Assets (1xxx)
        {
            'name': f'Cash - {currency}',
            'code': f'1000_{currency}',
            'account_type': AccountType.ASSET,
            'is_detail': True,
            'currency': currency,
        },
        {
            'name': f'Accounts Receivable - {currency}',
            'code': f'1200_{currency}',
            'account_type': AccountType.ASSET,
            'is_detail': True,
            'currency': currency,
        },
        {
            'name': f'Employee Advances - {currency}',
            'code': f'1210_{currency}',
            'account_type': AccountType.ASSET,
            'is_detail': True,
            'currency': currency,
        },
        {
            'name': f'Rental Receivable - {currency}',
            'code': f'1220_{currency}',
            'account_type': AccountType.ASSET,
            'is_detail': True,
            'currency': currency,
        },
        # Liabilities (2xxx)
        {
            'name': f'Accounts Payable - {currency}',
            'code': f'2000_{currency}',
            'account_type': AccountType.LIABILITY,
            'is_detail': True,
            'currency': currency,
        },
        # Equity (3xxx)
        {
            'name': f"Owner's Capital - {currency}",
            'code': f'3000_{currency}',
            'account_type': AccountType.EQUITY,
            'is_detail': True,
            'currency': currency,
        },
        # Income (4xxx)
        {
            'name': f'Student Fees Revenue - {currency}',
            'code': f'4000_{currency}',
            'account_type': AccountType.INCOME,
            'is_detail': True,
            'currency': currency,
        },
        {
            'name': f'Rental Income - {currency}',
            'code': f'4100_{currency}',
            'account_type': AccountType.INCOME,
            'is_detail': True,
            'currency': currency,
        },
        {
            'name': f'Other Income - {currency}',
            'code': f'4300_{currency}',
            'account_type': AccountType.INCOME,
            'is_detail': True,
            'currency': currency,
        },
        # Expenses (5xxx)
        {
            'name': f'Salaries and Wages - {currency}',
            'code': f'5000_{currency}',
            'account_type': AccountType.EXPENSE,
            'is_detail': True,
            'currency': currency,
        },
        {
            'name': f'Other Expenses - {currency}',
            'code': f'5900_{currency}',
            'account_type': AccountType.EXPENSE,
            'is_detail': True,
            'currency': currency,
        },
    ]


def _ensure_accounts_for_currency(currency: str) -> dict:
    created_codes = []
    restored_codes = []

    for acc_data in get_standard_accounts_for_currency(currency):
        account = Account.objects.filter(code=acc_data['code']).first()
        if account is None:
            Account.objects.create(**acc_data)
            created_codes.append(acc_data['code'])
            continue

        if account.is_deleted:
            account.is_deleted = False
            account.deleted_at = None
            account.deleted_by = None
            account.is_active = True
            account.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'is_active', 'updated_at'])
            restored_codes.append(acc_data['code'])

    return {
        'currency': currency,
        'currency_name': dict(CURRENCY_CHOICES).get(currency, currency),
        'created_count': len(created_codes),
        'restored_count': len(restored_codes),
        'created_codes': created_codes,
        'restored_codes': restored_codes,
    }


def _ensure_current_fiscal_year() -> dict:
    current_year = date.today().year
    fiscal_year, created = FiscalYear.objects.get_or_create(
        name=f'FY {current_year}',
        defaults={
            'start_date': date(current_year, 1, 1),
            'end_date': date(current_year, 12, 31),
            'is_closed': False,
        },
    )

    if fiscal_year.is_deleted:
        fiscal_year.restore()
        return {'name': fiscal_year.name, 'created': False, 'restored': True}

    return {'name': fiscal_year.name, 'created': created, 'restored': False}


@transaction.atomic
def ensure_chart_of_accounts(currencies=STANDARD_CURRENCIES) -> dict:
    """Create missing standard accounts and the current fiscal year.

    Safe to call repeatedly (migrate, management command, seed scripts).
    """
    currency_results = [_ensure_accounts_for_currency(currency) for currency in currencies]
    fiscal_year = _ensure_current_fiscal_year()

    return {
        'currencies': currency_results,
        'fiscal_year': fiscal_year,
        'accounts_created': sum(item['created_count'] for item in currency_results),
        'accounts_restored': sum(item['restored_count'] for item in currency_results),
    }
