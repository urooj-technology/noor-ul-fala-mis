from django.db.models import Q

from api.models.data.accounting import Account, FiscalYear, JournalEntry, Transaction
from api.models.data.advance import Advance
from api.models.data.employee import Employee
from api.models.data.expenses import Expense, ExpenseCategory
from api.models.data.other_income import OtherIncome
from api.models.data.payroll import Payroll
from api.models.data.shop_rental import Shop, ShopRental, Tenant
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.models.data.student import Student
from api.models.data.student_finance import FeeType, StudentFeeAssignment, StudentPayment
from api.services.accounting_service import AccountingService


def _employee_label(obj):
    return obj.full_name


def _payroll_label(obj):
    return f"{obj.employee.full_name} — {obj.month}/{obj.year}"


def _advance_label(obj):
    return f"{obj.employee.full_name} — {obj.amount} {obj.currency}"


def _student_label(obj):
    return obj.full_name


def _student_payment_label(obj):
    student = obj.assignment.student.full_name if obj.assignment and obj.assignment.student else 'Student'
    return f"{student} — {obj.amount} {obj.currency or 'AFN'}"


def _fee_assignment_label(obj):
    return f"{obj.student.full_name} — {obj.fee_type.name if obj.fee_type else 'Fee'}"


def _expense_label(obj):
    return f"{obj.category.name if obj.category else 'Expense'} — {obj.amount} {obj.currency}"


def _shop_rental_payment_label(obj):
    tenant = obj.rental.tenant.full_name if obj.rental and obj.rental.tenant else 'Tenant'
    return f"{tenant} — {obj.amount} {obj.currency or 'AFN'}"


DELETED_ITEM_MODELS = {
    'employee': {
        'label': 'Employee',
        'model': Employee,
        'label_fn': _employee_label,
        'search_q': lambda term: Q(full_name__icontains=term) | Q(position__icontains=term),
    },
    'payroll': {
        'label': 'Payroll',
        'model': Payroll,
        'label_fn': _payroll_label,
        'search_q': lambda term: Q(employee__full_name__icontains=term),
    },
    'advance': {
        'label': 'Advance',
        'model': Advance,
        'label_fn': _advance_label,
        'search_q': lambda term: Q(employee__full_name__icontains=term) | Q(reason__icontains=term),
    },
    'student': {
        'label': 'Student',
        'model': Student,
        'label_fn': _student_label,
        'search_q': lambda term: Q(full_name__icontains=term) | Q(father_name__icontains=term),
    },
    'student_payment': {
        'label': 'Student Payment',
        'model': StudentPayment,
        'label_fn': _student_payment_label,
        'search_q': lambda term: Q(assignment__student__full_name__icontains=term) | Q(reference_number__icontains=term),
    },
    'student_fee_assignment': {
        'label': 'Fee Assignment',
        'model': StudentFeeAssignment,
        'label_fn': _fee_assignment_label,
        'search_q': lambda term: Q(student__full_name__icontains=term) | Q(fee_type__name__icontains=term),
    },
    'fee_type': {
        'label': 'Fee Type',
        'model': FeeType,
        'label_fn': lambda obj: obj.name,
        'search_q': lambda term: Q(name__icontains=term),
    },
    'expense': {
        'label': 'Expense',
        'model': Expense,
        'label_fn': _expense_label,
        'search_q': lambda term: Q(category__name__icontains=term) | Q(description__icontains=term),
    },
    'expense_category': {
        'label': 'Expense Category',
        'model': ExpenseCategory,
        'label_fn': lambda obj: obj.name,
        'search_q': lambda term: Q(name__icontains=term),
    },
    'other_income': {
        'label': 'Other Income',
        'model': OtherIncome,
        'label_fn': lambda obj: f"{obj.amount} {obj.currency} — {obj.source or 'Income'}",
        'search_q': lambda term: Q(source__icontains=term) | Q(description__icontains=term),
    },
    'shop': {
        'label': 'Shop',
        'model': Shop,
        'label_fn': lambda obj: obj.shop_number or obj.name or str(obj),
        'search_q': lambda term: Q(shop_number__icontains=term) | Q(name__icontains=term),
    },
    'tenant': {
        'label': 'Tenant',
        'model': Tenant,
        'label_fn': lambda obj: obj.full_name,
        'search_q': lambda term: Q(full_name__icontains=term) | Q(phone__icontains=term),
    },
    'shop_rental': {
        'label': 'Shop Rental',
        'model': ShopRental,
        'label_fn': lambda obj: f"{obj.shop.shop_number if obj.shop else 'Shop'} — {obj.tenant.full_name if obj.tenant else 'Tenant'}",
        'search_q': lambda term: Q(shop__shop_number__icontains=term) | Q(tenant__full_name__icontains=term),
    },
    'shop_rental_payment': {
        'label': 'Rental Payment',
        'model': ShopRentalPayment,
        'label_fn': _shop_rental_payment_label,
        'search_q': lambda term: Q(rental__tenant__full_name__icontains=term) | Q(reference_number__icontains=term),
    },
    'account': {
        'label': 'Account',
        'model': Account,
        'label_fn': lambda obj: f"{obj.code} — {obj.name}",
        'search_q': lambda term: Q(code__icontains=term) | Q(name__icontains=term),
    },
    'journal_entry': {
        'label': 'Journal Entry',
        'model': JournalEntry,
        'label_fn': lambda obj: f"{obj.date} — {obj.account.code} Dr {obj.debit} Cr {obj.credit}",
        'search_q': lambda term: Q(description__icontains=term) | Q(reference__icontains=term) | Q(account__code__icontains=term),
    },
    'transaction': {
        'label': 'Transaction',
        'model': Transaction,
        'label_fn': lambda obj: f"{obj.number} — {obj.description or obj.get_transaction_type_display()}",
        'search_q': lambda term: Q(number__icontains=term) | Q(description__icontains=term) | Q(reference__icontains=term),
    },
    'fiscal_year': {
        'label': 'Fiscal Year',
        'model': FiscalYear,
        'label_fn': lambda obj: obj.name,
        'search_q': lambda term: Q(name__icontains=term),
    },
}


def list_deleted_items(model_key=None, search='', page=1, page_size=25):
    keys = [model_key] if model_key and model_key != 'all' else list(DELETED_ITEM_MODELS.keys())
    items = []

    for key in keys:
        cfg = DELETED_ITEM_MODELS.get(key)
        if not cfg:
            continue

        qs = cfg['model'].objects.filter(is_deleted=True).select_related('deleted_by').order_by('-deleted_at')
        if search:
            qs = qs.filter(cfg['search_q'](search))

        for obj in qs:
            items.append({
                'id': obj.id,
                'model': key,
                'model_label': cfg['label'],
                'label': cfg['label_fn'](obj),
                'deleted_at': obj.deleted_at.isoformat() if obj.deleted_at else None,
                'deleted_by': getattr(obj.deleted_by, 'username', None) if obj.deleted_by else None,
            })

    items.sort(key=lambda row: row['deleted_at'] or '', reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size

    return {
        'count': total,
        'page': page,
        'page_size': page_size,
        'results': items[start:end],
        'model_types': [
            {'key': key, 'label': cfg['label']}
            for key, cfg in DELETED_ITEM_MODELS.items()
        ],
    }


def restore_deleted_item(model_key, item_id):
    cfg = DELETED_ITEM_MODELS.get(model_key)
    if not cfg:
        raise ValueError(f'Unknown model type: {model_key}')

    instance = cfg['model'].objects.filter(pk=item_id, is_deleted=True).first()
    if not instance:
        raise ValueError(f'Deleted item not found: {model_key} #{item_id}')

    instance.restore()

    if model_key == 'transaction':
        for entry in instance.entries.filter(is_deleted=True):
            entry.restore()
    elif model_key == 'journal_entry' and instance.transaction_id:
        if instance.transaction.is_deleted:
            instance.transaction.restore()

    return instance


def restore_deleted_items(items):
    restored = []
    errors = []

    for item in items:
        model_key = item.get('model')
        item_id = item.get('id')
        try:
            restore_deleted_item(model_key, item_id)
            restored.append({'model': model_key, 'id': item_id})
        except Exception as exc:
            errors.append({
                'model': model_key,
                'id': item_id,
                'error': str(exc),
            })

    AccountingService.recalculate_all_account_balances()
    return restored, errors


def permanently_delete_item(model_key, item_id):
    """Permanently delete an item from the database"""
    cfg = DELETED_ITEM_MODELS.get(model_key)
    if not cfg:
        raise ValueError(f'Unknown model type: {model_key}')
    
    instance = cfg['model'].objects.filter(pk=item_id, is_deleted=True).first()
    if not instance:
        raise ValueError(f'Deleted item not found: {model_key} #{item_id}')
    
    # Store info before deletion
    label = cfg['label_fn'](instance)
    
    # Permanently delete
    instance.delete(hard=True)
    
    return {'model': model_key, 'id': item_id, 'label': label}


def permanently_delete_items(items):
    """Permanently delete multiple items"""
    deleted = []
    errors = []
    
    for item in items:
        model_key = item.get('model')
        item_id = item.get('id')
        try:
            result = permanently_delete_item(model_key, item_id)
            deleted.append(result)
        except Exception as exc:
            errors.append({
                'model': model_key,
                'id': item_id,
                'error': str(exc),
            })
    
    return deleted, errors
