from decimal import Decimal

from api.models.data.advance import Advance
from api.models.data.expenses import Expense
from api.models.data.payroll import Payroll
from api.utils.calendar import get_calendar_info
from api.utils.registration_dates import get_registration_date_range


def _date_fields(date_value):
    cal = get_calendar_info(date_value) if date_value else {}
    iso = date_value.isoformat() if date_value else None
    return iso, cal.get('shamsi'), cal.get('qamari')


def build_payroll_row(payroll):
    payment_date, shamsi, qamari = _date_fields(payroll.payment_date)
    employee = payroll.employee
    return {
        'id': f'payroll-{payroll.id}',
        'payment_type': 'payroll',
        'payment_date': payment_date,
        'payment_date_shamsi': shamsi,
        'payment_date_qamari': qamari,
        'amount': float(payroll.salary or 0),
        'currency': payroll.currency,
        'employee_name': employee.full_name if employee else None,
        'employee_position': employee.position if employee else None,
        'period_month': payroll.month,
        'period_year': payroll.year,
        'category_name': None,
        'user_name': None,
        'description': '',
    }


def build_advance_row(advance):
    payment_date, shamsi, qamari = _date_fields(advance.payment_date)
    employee = advance.employee
    return {
        'id': f'advance-{advance.id}',
        'payment_type': 'advance',
        'payment_date': payment_date,
        'payment_date_shamsi': shamsi,
        'payment_date_qamari': qamari,
        'amount': float(advance.amount or 0),
        'currency': advance.currency,
        'employee_name': employee.full_name if employee else None,
        'employee_position': employee.position if employee else None,
        'period_month': advance.month,
        'period_year': advance.year,
        'category_name': None,
        'user_name': None,
        'description': advance.reason or '',
    }


def build_expense_row(expense):
    payment_date, shamsi, qamari = _date_fields(expense.expense_date)
    user = expense.user
    user_name = None
    if user:
        user_name = f'{user.first_name or ""} {user.last_name or ""}'.strip() or user.username
    return {
        'id': f'expense-{expense.id}',
        'payment_type': 'expense',
        'payment_date': payment_date,
        'payment_date_shamsi': shamsi,
        'payment_date_qamari': qamari,
        'amount': float(expense.amount or 0),
        'currency': expense.currency,
        'employee_name': None,
        'employee_position': None,
        'period_month': None,
        'period_year': None,
        'category_name': expense.category.name if expense.category else None,
        'user_name': user_name,
        'description': expense.description or '',
    }


def _sum_amount(rows, payment_type):
    return float(sum(r['amount'] for r in rows if r['payment_type'] == payment_type))


def _row_matches_search(row, term):
    if not term:
        return True
    term = term.lower()
    haystack = ' '.join(
        str(row.get(key) or '')
        for key in (
            'payment_type', 'category_name', 'employee_name', 'employee_position',
            'user_name', 'description', 'currency',
        )
    ).lower()
    return term in haystack


def build_payment_report(
    *,
    date_period,
    date_from=None,
    date_to=None,
    employee=None,
    position=None,
    category=None,
    user=None,
    payment_type=None,
    search=None,
    include_payroll=True,
    include_advance=True,
    include_expense=True,
):
    range_start, range_end = get_registration_date_range(date_period, date_from, date_to)
    if not range_start or not range_end:
        return [], {
            'payroll_total': 0,
            'advance_total': 0,
            'expense_total': 0,
            'grand_total': 0,
            'payroll_count': 0,
            'advance_count': 0,
            'expense_count': 0,
            'count': 0,
        }

    rows = []

    if include_payroll and payment_type in (None, '', 'payroll'):
        payroll_qs = Payroll.objects.filter(
            is_deleted=False,
            payment_date__gte=range_start,
            payment_date__lte=range_end,
        ).select_related('employee').order_by('-payment_date')
        if employee:
            payroll_qs = payroll_qs.filter(employee_id=employee)
        if position:
            payroll_qs = payroll_qs.filter(employee__position=position)
        rows.extend(build_payroll_row(p) for p in payroll_qs)

    if include_advance and payment_type in (None, '', 'advance'):
        advance_qs = Advance.objects.filter(
            is_deleted=False,
            payment_date__gte=range_start,
            payment_date__lte=range_end,
        ).select_related('employee').order_by('-payment_date')
        if employee:
            advance_qs = advance_qs.filter(employee_id=employee)
        if position:
            advance_qs = advance_qs.filter(employee__position=position)
        rows.extend(build_advance_row(a) for a in advance_qs)

    # Position applies only to employee payments; skip expenses when filtering by position
    if include_expense and not position and payment_type in (None, '', 'expense'):
        expense_qs = Expense.objects.filter(
            is_deleted=False,
            expense_date__gte=range_start,
            expense_date__lte=range_end,
        ).select_related('category', 'user').order_by('-expense_date')
        if category:
            expense_qs = expense_qs.filter(category_id=category)
        if user:
            expense_qs = expense_qs.filter(user_id=user)
        rows.extend(build_expense_row(e) for e in expense_qs)

    if search:
        rows = [r for r in rows if _row_matches_search(r, search)]

    type_order = {'payroll': 0, 'advance': 1, 'expense': 2}
    rows.sort(key=lambda r: r['payment_date'] or '', reverse=True)
    rows.sort(key=lambda r: type_order.get(r['payment_type'], 9))

    payroll_count = sum(1 for r in rows if r['payment_type'] == 'payroll')
    advance_count = sum(1 for r in rows if r['payment_type'] == 'advance')
    expense_count = sum(1 for r in rows if r['payment_type'] == 'expense')
    payroll_total = _sum_amount(rows, 'payroll')
    advance_total = _sum_amount(rows, 'advance')
    expense_total = _sum_amount(rows, 'expense')

    return rows, {
        'payroll_total': payroll_total,
        'advance_total': advance_total,
        'expense_total': expense_total,
        'grand_total': payroll_total + advance_total + expense_total,
        'payroll_count': payroll_count,
        'advance_count': advance_count,
        'expense_count': expense_count,
        'count': len(rows),
    }
