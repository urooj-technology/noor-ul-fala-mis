"""Currency helpers for reports and accounting."""

from api.models.data.choices import CURRENCY_CHOICES

VALID_CURRENCIES = {code for code, _ in CURRENCY_CHOICES}


def normalize_currency(value, default='AFN'):
    """Return a supported currency code or *default*."""
    if value in VALID_CURRENCIES:
        return value
    return default


def account_currency(account, default='AFN'):
    """Resolve currency from an account's field or code suffix."""
    if not account:
        return default
    if account.currency in VALID_CURRENCIES:
        return account.currency
    if '_' in account.code:
        suffix = account.code.rsplit('_', 1)[-1]
        if suffix in VALID_CURRENCIES:
            return suffix
    return default


def journal_entry_currency(entry, default='AFN'):
    """Resolve currency for a journal entry line."""
    if not entry:
        return default
    return account_currency(getattr(entry, 'account', None), default=default)
