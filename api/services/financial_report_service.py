from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from api.models.data.accounting import Account, JournalEntry
from api.models.data.student_finance import StudentPayment
from api.services.accounting_service import AccountingService
from api.utils.currency import journal_entry_currency, normalize_currency

CURRENCIES = ['AFN', 'USD']

INCOME_ACCOUNTS = {
    'student': '4000',
    'rental': '4100',
    'other': '4300',
}

EXPENSE_ACCOUNTS = {
    'payroll': '5000',
    'general': '5900',
}

# Cash paid to employees as advances (asset account 1210, not P&L expense).
ADVANCE_ACCOUNTS = {
    'advances': '1210',
}

CASH_ACCOUNT_CODE = '1000'


def currency_totals():
    return {currency: Decimal('0') for currency in CURRENCIES}


def get_date_range(period, start_date=None, end_date=None):
    """Calculate inclusive Gregorian date range for a report period."""
    today = timezone.now().date()

    if period == 'custom':
        if start_date and end_date:
            return {'start': start_date, 'end': end_date}
        if start_date:
            return {'start': start_date, 'end': today.isoformat()}
        if end_date:
            return {'start': None, 'end': end_date}
        return {'start': None, 'end': None}

    if period == 'daily':
        return {'start': today.isoformat(), 'end': today.isoformat()}

    if period == 'weekly':
        week_start = today - timedelta(days=today.weekday())
        return {'start': week_start.isoformat(), 'end': today.isoformat()}

    if period == 'monthly':
        month_start = today.replace(day=1)
        return {'start': month_start.isoformat(), 'end': today.isoformat()}

    if period == 'yearly':
        year_start = today.replace(month=1, day=1)
        return {'start': year_start.isoformat(), 'end': today.isoformat()}

    return {'start': None, 'end': None}


def _filter_entries(currency, start_date, end_date):
    entries = JournalEntry.active().filter(account__code__endswith=f'_{currency}')
    if start_date:
        entries = entries.filter(date__gte=start_date)
    if end_date:
        entries = entries.filter(date__lte=end_date)
    return entries


def _sum_for_account_code(account_code, currency, start_date, end_date, field):
    account = Account.objects.filter(code=f'{account_code}_{currency}', is_active=True).first()
    if not account:
        return Decimal('0')

    entries = JournalEntry.active().filter(account=account)
    if start_date:
        entries = entries.filter(date__gte=start_date)
    if end_date:
        entries = entries.filter(date__lte=end_date)

    total = entries.aggregate(total=Sum(field))['total']
    return Decimal(str(total or 0))


def _income_amount(account_code, currency, start_date, end_date):
    """Income is recognized on the credit side of income accounts."""
    credits = _sum_for_account_code(account_code, currency, start_date, end_date, 'credit')
    debits = _sum_for_account_code(account_code, currency, start_date, end_date, 'debit')
    return credits - debits


def _expense_amount(account_code, currency, start_date, end_date):
    """Expenses are recognized on the debit side of expense accounts."""
    debits = _sum_for_account_code(account_code, currency, start_date, end_date, 'debit')
    credits = _sum_for_account_code(account_code, currency, start_date, end_date, 'credit')
    return debits - credits


def _cash_outflow_amount(account_code, currency, start_date, end_date):
    """Employee advances increase the asset account on debit."""
    debits = _sum_for_account_code(account_code, currency, start_date, end_date, 'debit')
    credits = _sum_for_account_code(account_code, currency, start_date, end_date, 'credit')
    return debits - credits


def _cash_balance(currency, as_of_date=None):
    """Actual cash on hand from the cash ledger account (1000)."""
    account = Account.objects.filter(
        code=f'{CASH_ACCOUNT_CODE}_{currency}',
        is_active=True,
    ).first()
    if not account:
        return Decimal('0')
    as_of = as_of_date or timezone.now().date()
    return AccountingService._get_account_balance(account, as_of_date=as_of)


def _student_payment_cash_collected(currency, start_date, end_date):
    """Cash collected from students, bucketed by payment currency (not journal account)."""
    currency = normalize_currency(currency)
    payments = StudentPayment.completed().filter(currency=currency)
    if start_date:
        payments = payments.filter(payment_date__gte=start_date)
    if end_date:
        payments = payments.filter(payment_date__lte=end_date)

    payment_total = payments.aggregate(total=Sum('amount'))['total']
    if payment_total:
        return Decimal(str(payment_total))

    # Fallback for legacy journals without matching payment rows
    entries = JournalEntry.active().filter(
        transaction__transaction_type='student_payment',
        account__code__startswith='1000_',
    ).select_related('account')
    if start_date:
        entries = entries.filter(date__gte=start_date)
    if end_date:
        entries = entries.filter(date__lte=end_date)

    total = Decimal('0')
    for entry in entries:
        if journal_entry_currency(entry) != currency:
            continue
        total += Decimal(str(entry.debit or 0)) - Decimal(str(entry.credit or 0))
    return total


def _student_income_amount(currency, start_date, end_date):
    """Student income: fee revenue on 4000 when posted, else cash collected from payments."""
    accrual_revenue = _income_amount(INCOME_ACCOUNTS['student'], currency, start_date, end_date)
    if accrual_revenue > 0:
        return accrual_revenue
    return _student_payment_cash_collected(currency, start_date, end_date)


def build_financial_summary(period='monthly', start_date=None, end_date=None):
    """Build a unified financial summary from active journal entries only."""
    date_range = get_date_range(period, start_date, end_date)
    start = date_range['start']
    end = date_range['end']

    income = {key: currency_totals() for key in INCOME_ACCOUNTS}
    expenses = {
        **{key: currency_totals() for key in EXPENSE_ACCOUNTS},
        **{key: currency_totals() for key in ADVANCE_ACCOUNTS},
    }

    income_breakdown = []
    expense_breakdown = []

    for currency in CURRENCIES:
        for key, code in INCOME_ACCOUNTS.items():
            if key == 'student':
                amount = _student_income_amount(currency, start, end)
            else:
                amount = _income_amount(code, currency, start, end)
            if amount != 0:
                income[key][currency] = float(amount)
                income_breakdown.append({
                    'category': key,
                    'name': dict(student='Student Fees', rental='Rental Income', other='Other Income')[key],
                    'currency': currency,
                    'amount': float(amount),
                })

        for key, code in EXPENSE_ACCOUNTS.items():
            amount = _expense_amount(code, currency, start, end)
            if amount != 0:
                expenses[key][currency] = float(amount)
                expense_breakdown.append({
                    'category': key,
                    'name': dict(payroll='Payroll', general='General Expenses')[key],
                    'currency': currency,
                    'amount': float(amount),
                })

        for key, code in ADVANCE_ACCOUNTS.items():
            amount = _cash_outflow_amount(code, currency, start, end)
            if amount != 0:
                expenses[key][currency] = float(amount)
                expense_breakdown.append({
                    'category': key,
                    'name': 'Employee Advances',
                    'currency': currency,
                    'amount': float(amount),
                })

    total_income = currency_totals()
    total_expenses = currency_totals()
    payroll_total = currency_totals()

    for currency in CURRENCIES:
        total_income[currency] = sum(Decimal(str(income[key][currency])) for key in income)
        total_expenses[currency] = sum(Decimal(str(expenses[key][currency])) for key in expenses)
        payroll_total[currency] = (
            Decimal(str(expenses['payroll'][currency])) + Decimal(str(expenses['advances'][currency]))
        )

    # Net profit = income minus all expenses. Advances are part of payroll, not excluded.
    profit = {
        currency: float(total_income[currency] - total_expenses[currency])
        for currency in CURRENCIES
    }
    net_cash_position = profit
    cash_as_of = end or timezone.now().date().isoformat()
    cash_balance = {
        currency: float(_cash_balance(currency, as_of_date=cash_as_of))
        for currency in CURRENCIES
    }

    return {
        'period': period,
        'date_range': date_range,
        'generated_at': timezone.now().isoformat(),
        'income': {
            'student': {c: float(income['student'][c]) for c in CURRENCIES},
            'student_payments': {c: float(income['student'][c]) for c in CURRENCIES},
            'rental': {c: float(income['rental'][c]) for c in CURRENCIES},
            'rental_income': {c: float(income['rental'][c]) for c in CURRENCIES},
            'other': {c: float(income['other'][c]) for c in CURRENCIES},
            'other_income': {c: float(income['other'][c]) for c in CURRENCIES},
            'total': {c: float(total_income[c]) for c in CURRENCIES},
        },
        'expenses': {
            'payroll': {c: float(expenses['payroll'][c]) for c in CURRENCIES},
            'payroll_total': {c: float(payroll_total[c]) for c in CURRENCIES},
            'general': {c: float(expenses['general'][c]) for c in CURRENCIES},
            'general_expenses': {c: float(expenses['general'][c]) for c in CURRENCIES},
            'advances': {c: float(expenses['advances'][c]) for c in CURRENCIES},
            'total': {c: float(total_expenses[c]) for c in CURRENCIES},
            'breakdown': {
                'payroll': {c: float(expenses['payroll'][c]) for c in CURRENCIES},
                'general_expenses': {c: float(expenses['general'][c]) for c in CURRENCIES},
                'advances': {c: float(expenses['advances'][c]) for c in CURRENCIES},
            },
        },
        'cash_outflows': {
            'advances': {c: expenses['advances'][c] for c in CURRENCIES},
            'total': {c: expenses['advances'][c] for c in CURRENCIES},
        },
        'profit': profit,
        'net_cash_position': net_cash_position,
        'cash_balance': cash_balance,
        'income_breakdown': income_breakdown,
        'expense_breakdown': expense_breakdown,
        'cash_outflow_breakdown': [
            item for item in expense_breakdown if item['category'] == 'advances'
        ],
    }


def build_payroll_report(period='monthly', start_date=None, end_date=None):
    date_range = get_date_range(period, start_date, end_date)
    start = date_range['start']
    end = date_range['end']

    payroll_by_employee = []
    advance_by_employee = []

    payroll_entries = JournalEntry.active().filter(
        account__code__startswith='5000_',
        transaction__transaction_type='payroll',
    )
    advance_entries = JournalEntry.active().filter(
        account__code__startswith='1210_',
        transaction__transaction_type='advance',
    )
    if start:
        payroll_entries = payroll_entries.filter(date__gte=start)
        advance_entries = advance_entries.filter(date__gte=start)
    if end:
        payroll_entries = payroll_entries.filter(date__lte=end)
        advance_entries = advance_entries.filter(date__lte=end)

    for entry in payroll_entries.select_related('account', 'transaction'):
        currency = journal_entry_currency(entry)
        amount = entry.debit - entry.credit
        if amount <= 0:
            continue
        payroll_by_employee.append({
            'employee': (entry.description or entry.transaction.description or 'Employee').replace('Salary Payment - ', '').replace('Salary Payment Reversal - ', ''),
            'currency': currency,
            'amount': float(amount),
            'date': str(entry.date),
            'reference': entry.reference or entry.transaction.reference,
        })

    for entry in advance_entries.select_related('account', 'transaction'):
        currency = journal_entry_currency(entry)
        amount = entry.debit - entry.credit
        if amount <= 0:
            continue
        advance_by_employee.append({
            'employee': (entry.description or entry.transaction.description or 'Employee').replace('Advance Payment - ', '').replace('Advance Payment Reversal - ', ''),
            'currency': currency,
            'amount': float(amount),
            'date': str(entry.date),
            'reference': entry.reference or entry.transaction.reference,
        })

    summary = build_financial_summary(period, start_date, end_date)

    return {
        'period': period,
        'date_range': date_range,
        'generated_at': timezone.now().isoformat(),
        'payroll': {
            'total': summary['expenses']['payroll'],
            'journal_total': summary['expenses']['payroll'],
            'by_employee': payroll_by_employee,
        },
        'advances': {
            'total': summary['expenses']['advances'],
            'journal_total': summary['expenses']['advances'],
            'by_employee': advance_by_employee,
        },
    }


INCOME_LINE_LABELS = {
    'student': 'Student Payments',
    'rental': 'Rental Income',
    'other': 'Other Income',
}

EXPENSE_LINE_LABELS = {
    'payroll': 'Payroll Expenses',
    'payroll_salary': 'Salaries & Wages',
    'payroll_advances': 'Advances',
    'general': 'General Expenses',
}


def build_income_statement(start_date=None, end_date=None):
    """Income statement using the same ledger logic as the dashboard and reports."""
    result = {
        'start_date': start_date,
        'end_date': end_date,
        'by_currency': {},
        'grand_total_income': Decimal('0'),
        'grand_total_expenses': Decimal('0'),
        'grand_net_income': Decimal('0'),
    }

    for currency in CURRENCIES:
        income_items = []
        total_income = Decimal('0')

        for key, code in INCOME_ACCOUNTS.items():
            if key == 'student':
                amount = _student_income_amount(currency, start_date, end_date)
            else:
                amount = _income_amount(code, currency, start_date, end_date)
            if amount != 0:
                income_items.append({
                    'code': f'{code}_{currency}',
                    'name': INCOME_LINE_LABELS[key],
                    'type': 'Income',
                    'currency': currency,
                    'amount': float(amount),
                })
                total_income += amount

        expense_items = []
        total_expenses = Decimal('0')

        payroll_salary = _expense_amount(EXPENSE_ACCOUNTS['payroll'], currency, start_date, end_date)
        payroll_advances = _cash_outflow_amount(ADVANCE_ACCOUNTS['advances'], currency, start_date, end_date)
        payroll_combined = payroll_salary + payroll_advances

        if payroll_combined != 0:
            expense_items.append({
                'code': f'{EXPENSE_ACCOUNTS["payroll"]}_{currency}',
                'name': EXPENSE_LINE_LABELS['payroll'],
                'type': 'Expense',
                'currency': currency,
                'amount': float(payroll_combined),
            })
            total_expenses += payroll_combined
            if payroll_salary != 0:
                expense_items.append({
                    'code': f'{EXPENSE_ACCOUNTS["payroll"]}_{currency}-detail',
                    'name': EXPENSE_LINE_LABELS['payroll_salary'],
                    'type': 'Expense',
                    'currency': currency,
                    'amount': float(payroll_salary),
                    'is_subtotal': True,
                })
            if payroll_advances != 0:
                expense_items.append({
                    'code': f'{ADVANCE_ACCOUNTS["advances"]}_{currency}-detail',
                    'name': EXPENSE_LINE_LABELS['payroll_advances'],
                    'type': 'Expense',
                    'currency': currency,
                    'amount': float(payroll_advances),
                    'is_subtotal': True,
                })

        general_amount = _expense_amount(EXPENSE_ACCOUNTS['general'], currency, start_date, end_date)
        if general_amount != 0:
            expense_items.append({
                'code': f'{EXPENSE_ACCOUNTS["general"]}_{currency}',
                'name': EXPENSE_LINE_LABELS['general'],
                'type': 'Expense',
                'currency': currency,
                'amount': float(general_amount),
            })
            total_expenses += general_amount

        net_income = total_income - total_expenses
        result['by_currency'][currency] = {
            'income': income_items,
            'total_income': float(total_income),
            'expenses': expense_items,
            'total_expenses': float(total_expenses),
            'net_income': float(net_income),
            'is_profit': net_income > 0,
        }
        result['grand_total_income'] += total_income
        result['grand_total_expenses'] += total_expenses

    result['grand_net_income'] = float(
        result['grand_total_income'] - result['grand_total_expenses']
    )
    result['grand_total_income'] = float(result['grand_total_income'])
    result['grand_total_expenses'] = float(result['grand_total_expenses'])
    result['grand_totals_note'] = (
        'Grand totals sum AFN and USD without exchange conversion. Use per-currency totals.'
    )
    return result


def build_accounting_report(report_type, period='monthly', start_date=None, end_date=None):
    today = timezone.now().date()
    date_range = get_date_range(period, start_date, end_date)
    start = date_range['start'] or today.replace(day=1).isoformat()
    end = date_range['end'] or today.isoformat()

    if report_type == 'trial_balance':
        return AccountingService.get_trial_balance(as_of_date=end)
    if report_type == 'income_statement':
        return build_income_statement(start, end)
    if report_type == 'balance_sheet':
        return AccountingService.get_balance_sheet(as_of_date=end)
    return None
