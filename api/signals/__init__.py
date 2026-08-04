from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from decimal import Decimal
from api.models.data.student_finance import StudentPayment, StudentFeeAssignment
from api.models.data.expenses import Expense
from api.models.data.payroll import Payroll
from api.models.data.advance import Advance
from api.models.data.other_income import OtherIncome
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.services.accounting_service import AccountingService
from api.models.data.choices import DEFAULT_CURRENCY
from api.utils.currency import normalize_currency

# Import file upload signal handlers
from api.signals.file_upload_handler import connect_signal_handlers


def _adj_reference(base_ref, instance):
    ts = instance.updated_at.strftime('%Y%m%d%H%M%S%f')
    return f"{base_ref}-ADJ-{ts}"


def _snapshot_accounting_fields(sender, instance, fields):
    if not instance.pk:
        instance._accounting_previous = None
        return
    instance._accounting_previous = sender.objects.filter(pk=instance.pk).values(*fields).first()


def _sync_monetary_document(
    instance,
    created,
    reference,
    amount_field,
    date_field,
    currency_field,
    ensure_fn,
    record_increase_fn,
    record_decrease_fn,
    void_description_fn,
    structural_change=False,
):
    """Keep journal entries aligned when a source document is voided, restored, or edited."""
    previous = getattr(instance, '_accounting_previous', None)

    if instance.is_deleted:
        if not previous or not previous.get('is_deleted'):
            AccountingService.void_source_document_journals(
                reference,
                date=getattr(instance, date_field),
                description=void_description_fn(instance),
            )
        return

    if created:
        ensure_fn(instance)
        return

    if not previous:
        return

    if previous.get('is_deleted') and not instance.is_deleted:
        curr_amount = Decimal(str(getattr(instance, amount_field) or 0))
        if curr_amount > 0:
            restore_ref = f"{reference}-RESTORE-{instance.updated_at.strftime('%Y%m%d%H%M%S%f')}"
            record_increase_fn(instance, curr_amount, restore_ref)
        return

    if structural_change:
        AccountingService.void_source_document_journals(
            reference,
            date=getattr(instance, date_field),
            description=f"{void_description_fn(instance)} (reclassification)",
        )
        current_amount = Decimal(str(getattr(instance, amount_field) or 0))
        if current_amount > 0:
            record_increase_fn(instance, current_amount, _adj_reference(reference, instance))
        return

    prev_amount = Decimal(str(previous.get(amount_field) or 0))
    curr_amount = Decimal(str(getattr(instance, amount_field) or 0))
    prev_currency = previous.get(currency_field) or DEFAULT_CURRENCY
    curr_currency = getattr(instance, currency_field) or DEFAULT_CURRENCY

    if prev_currency != curr_currency:
        AccountingService.void_source_document_journals(
            reference,
            date=getattr(instance, date_field),
            description=f"{void_description_fn(instance)} (currency change)",
        )
        if curr_amount > 0:
            record_increase_fn(instance, curr_amount, _adj_reference(reference, instance))
        return

    delta = curr_amount - prev_amount
    if delta > 0:
        record_increase_fn(instance, delta, _adj_reference(reference, instance))
    elif delta < 0:
        record_decrease_fn(instance, abs(delta), _adj_reference(reference, instance))


def _student_payment_currency(payment):
    """Resolve payment currency from payment row, then assignment, default AFN."""
    if payment.currency:
        return normalize_currency(payment.currency)
    if payment.assignment and payment.assignment.currency:
        return normalize_currency(payment.assignment.currency)
    return 'AFN'


def _student_payment_description(payment):
    student = payment.assignment.student if payment.assignment and payment.assignment.student else None
    fee_type = payment.fee_type or (payment.assignment.fee_type if payment.assignment else None)
    parts = [student.full_name if student else 'Student']
    if fee_type:
        parts.append(fee_type.name)
    if payment.period_year and payment.period_month:
        parts.append(f"{payment.period_year}/{payment.period_month}")
    return " - ".join(parts)


@receiver(pre_save, sender=StudentFeeAssignment)
def snapshot_fee_assignment_for_accounting(sender, instance, **kwargs):
    """Store previous accounting fields so post_save can record only the delta."""
    if not instance.pk:
        instance._accounting_previous = None
        return

    previous = sender.objects.filter(pk=instance.pk).values(
        'amount', 'currency', 'is_active'
    ).first()
    instance._accounting_previous = previous


@receiver(pre_save, sender=StudentPayment)
def snapshot_student_payment_for_accounting(sender, instance, **kwargs):
    """Store previous payment fields so post_save can detect completed deltas."""
    if not instance.pk:
        instance._accounting_previous = None
        return

    previous = sender.objects.filter(pk=instance.pk).values(
        'amount', 'currency', 'payment_status', 'is_deleted'
    ).first()
    instance._accounting_previous = previous


@receiver(post_save, sender=StudentFeeAssignment)
def create_fee_assignment_journal(sender, instance, created, **kwargs):
    """Create/adjust journal entry when fees are assigned to a student."""
    try:
        previous = getattr(instance, '_accounting_previous', None)
        current_amount = Decimal(str(instance.amount or 0))

        if created:
            if instance.is_active and current_amount > 0:
                AccountingService.ensure_fee_assignment_journal(instance)
            return

        if not previous:
            return

        previous_amount = Decimal(str(previous.get('amount') or 0))
        previous_active = previous.get('is_active')
        previous_currency = previous.get('currency') or DEFAULT_CURRENCY
        current_currency = instance.currency or DEFAULT_CURRENCY
        current_active = instance.is_active

        if previous_active and current_active and previous_currency != current_currency:
            if previous_amount > 0:
                AccountingService.record_student_fee_assignment_reversal(
                    assignment=instance,
                    amount=previous_amount,
                    reference=f"FEE-ASSIGN-CUR-{instance.id}-{instance.updated_at:%Y%m%d%H%M%S%f}",
                    description=f"Fee Assignment Currency Change - {instance.student.full_name}",
                    currency=previous_currency,
                )
            if current_amount > 0:
                AccountingService.record_student_fee_assignment(
                    assignment=instance,
                    amount=current_amount,
                    reference=f"FEE-ASSIGN-CUR-{instance.id}-{instance.updated_at:%Y%m%d%H%M%S%f}",
                    description=f"Fee Assignment Currency Change - {instance.student.full_name}",
                    currency=current_currency,
                )
            return

        if previous_active and current_active:
            delta = current_amount - previous_amount
        elif not previous_active and current_active:
            delta = current_amount
        elif previous_active and not current_active:
            delta = -previous_amount
        else:
            delta = Decimal('0')

        if delta > 0:
            AccountingService.record_student_fee_assignment(
                assignment=instance,
                amount=delta,
                reference=f"FEE-ASSIGN-ADJ-{instance.id}-{instance.updated_at:%Y%m%d%H%M%S%f}",
                description=f"Fee Assignment Increase - {instance.student.full_name}",
            )
        elif delta < 0:
            AccountingService.record_student_fee_assignment_reversal(
                assignment=instance,
                amount=abs(delta),
                reference=f"FEE-ASSIGN-ADJ-{instance.id}-{instance.updated_at:%Y%m%d%H%M%S%f}",
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create journal entry for fee assignment {instance.id}: {e}")


@receiver(post_save, sender=StudentPayment)
def create_student_payment_journal(sender, instance, created, **kwargs):
    """Create journal entry when student payment is created or marked as completed"""
    try:
        student_obj = instance.assignment.student if instance.assignment and instance.assignment.student else None
        if not student_obj:
            return

        current_amount = Decimal(str(instance.amount or 0))
        previous = getattr(instance, '_accounting_previous', None)
        description = _student_payment_description(instance)
        currency = _student_payment_currency(instance)

        if instance.is_deleted:
            if not previous or not previous.get('is_deleted'):
                if previous and previous.get('payment_status') == 'completed' and instance.reference_number:
                    AccountingService.void_source_document_journals(
                        instance.reference_number,
                        date=instance.payment_date,
                        description=f"Student Payment Deleted - {description}",
                    )
            return

        if not created and previous and previous.get('is_deleted') and not instance.is_deleted:
            if instance.payment_status == 'completed' and current_amount > 0:
                AccountingService.record_student_payment(
                    student_id=student_obj.id,
                    amount=current_amount,
                    date=instance.payment_date,
                    description=description,
                    reference=instance.reference_number,
                    payment_cycle='interval',
                    currency=currency,
                )
            return

        if created:
            if instance.payment_status == 'completed' and current_amount > 0:
                AccountingService.record_student_payment(
                    student_id=student_obj.id,
                    amount=current_amount,
                    date=instance.payment_date,
                    description=description,
                    reference=instance.reference_number,
                    payment_cycle='interval',
                    currency=currency
                )
            return

        if not previous:
            return

        previous_amount = Decimal(str(previous.get('amount') or 0))
        was_completed = previous.get('payment_status') == 'completed'
        is_completed = instance.payment_status == 'completed'
        previous_currency = normalize_currency(previous.get('currency')) if previous.get('currency') else currency

        if was_completed and is_completed and previous_currency != currency:
            if previous_amount > 0:
                AccountingService.record_student_payment_reversal(
                    student_id=student_obj.id,
                    amount=previous_amount,
                    date=instance.payment_date,
                    description=description,
                    reference=f"{instance.reference_number}-CUR-REV",
                    currency=previous_currency
                )
            if current_amount > 0:
                AccountingService.record_student_payment(
                    student_id=student_obj.id,
                    amount=current_amount,
                    date=instance.payment_date,
                    description=description,
                    reference=f"{instance.reference_number}-CUR",
                    payment_cycle='interval',
                    currency=currency
                )
            return

        if not was_completed and is_completed:
            delta = current_amount
        elif was_completed and is_completed:
            delta = current_amount - previous_amount
        elif was_completed and not is_completed:
            delta = -previous_amount
        else:
            delta = Decimal('0')

        if delta > 0:
            AccountingService.record_student_payment(
                student_id=student_obj.id,
                amount=delta,
                date=instance.payment_date,
                description=description,
                reference=f"{instance.reference_number}-ADJ",
                payment_cycle='interval',
                currency=currency
            )
        elif delta < 0:
            AccountingService.record_student_payment_reversal(
                student_id=student_obj.id,
                amount=abs(delta),
                date=instance.payment_date,
                description=description,
                reference=f"{instance.reference_number}-REV",
                currency=normalize_currency(previous.get('currency')) if previous.get('currency') else currency
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create journal entry for student payment {instance.id}: {e}")


@receiver(pre_save, sender=Expense)
def snapshot_expense_for_accounting(sender, instance, **kwargs):
    _snapshot_accounting_fields(
        sender, instance, ['amount', 'currency', 'expense_date', 'is_deleted', 'category_id']
    )


@receiver(post_save, sender=Expense)
def sync_expense_journal(sender, instance, created, **kwargs):
    try:
        reference = f"EXPENSE-{instance.id}"
        previous = getattr(instance, '_accounting_previous', None)
        structural_change = bool(
            previous
            and not created
            and previous.get('category_id') != instance.category_id
        )

        _sync_monetary_document(
            instance=instance,
            created=created,
            reference=reference,
            amount_field='amount',
            date_field='expense_date',
            currency_field='currency',
            ensure_fn=AccountingService.ensure_expense_journal,
            record_increase_fn=lambda obj, amount, ref: AccountingService.record_expense_adjustment(
                obj, amount, reference=ref
            ),
            record_decrease_fn=lambda obj, amount, ref: AccountingService.record_expense_reversal(
                obj, amount, reference=ref
            ),
            void_description_fn=lambda obj: f"Void Expense - {obj.category.name if obj.category else 'Expense'}",
            structural_change=structural_change,
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to sync journal entry for expense {instance.id}: {e}")


@receiver(pre_save, sender=Payroll)
def snapshot_payroll_for_accounting(sender, instance, **kwargs):
    _snapshot_accounting_fields(
        sender, instance, ['salary', 'currency', 'payment_date', 'is_deleted']
    )


@receiver(post_save, sender=Payroll)
def sync_payroll_journal(sender, instance, created, **kwargs):
    try:
        reference = f"PAYROLL-{instance.id}"
        _sync_monetary_document(
            instance=instance,
            created=created,
            reference=reference,
            amount_field='salary',
            date_field='payment_date',
            currency_field='currency',
            ensure_fn=AccountingService.ensure_payroll_journal,
            record_increase_fn=lambda obj, amount, ref: AccountingService.record_payroll(
                employee_name=obj.employee.full_name,
                amount=amount,
                date=obj.payment_date,
                reference=ref,
                currency=obj.currency or DEFAULT_CURRENCY,
            ),
            record_decrease_fn=lambda obj, amount, ref: AccountingService.record_payroll_reversal(
                employee_name=obj.employee.full_name,
                amount=amount,
                date=obj.payment_date,
                reference=ref,
                currency=obj.currency or DEFAULT_CURRENCY,
            ),
            void_description_fn=lambda obj: f"Void Payroll - {obj.employee.full_name}",
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to sync journal entry for payroll {instance.id}: {e}")


@receiver(pre_save, sender=Advance)
def snapshot_advance_for_accounting(sender, instance, **kwargs):
    _snapshot_accounting_fields(
        sender, instance, ['amount', 'currency', 'payment_date', 'is_deleted']
    )


@receiver(post_save, sender=Advance)
def sync_advance_journal(sender, instance, created, **kwargs):
    try:
        reference = f"ADVANCE-{instance.id}"
        _sync_monetary_document(
            instance=instance,
            created=created,
            reference=reference,
            amount_field='amount',
            date_field='payment_date',
            currency_field='currency',
            ensure_fn=AccountingService.ensure_advance_journal,
            record_increase_fn=lambda obj, amount, ref: AccountingService.record_advance(
                employee_name=obj.employee.full_name,
                amount=amount,
                date=obj.payment_date,
                reference=ref,
                currency=obj.currency or DEFAULT_CURRENCY,
            ),
            record_decrease_fn=lambda obj, amount, ref: AccountingService.record_advance_reversal(
                employee_name=obj.employee.full_name,
                amount=amount,
                date=obj.payment_date,
                reference=ref,
                currency=obj.currency or DEFAULT_CURRENCY,
            ),
            void_description_fn=lambda obj: f"Void Advance - {obj.employee.full_name}",
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to sync journal entry for advance {instance.id}: {e}")


@receiver(pre_save, sender=OtherIncome)
def snapshot_other_income_for_accounting(sender, instance, **kwargs):
    _snapshot_accounting_fields(
        sender, instance, ['amount', 'currency', 'income_date', 'is_deleted']
    )


@receiver(post_save, sender=OtherIncome)
def sync_other_income_journal(sender, instance, created, **kwargs):
    try:
        reference = f"INCOME-{instance.id}"
        _sync_monetary_document(
            instance=instance,
            created=created,
            reference=reference,
            amount_field='amount',
            date_field='income_date',
            currency_field='currency',
            ensure_fn=AccountingService.ensure_other_income_journal,
            record_increase_fn=lambda obj, amount, ref: AccountingService.record_other_income_adjustment(
                obj, amount, reference=ref
            ),
            record_decrease_fn=lambda obj, amount, ref: AccountingService.record_other_income_reversal(
                obj, amount, reference=ref
            ),
            void_description_fn=lambda obj: (
                f"Void Other Income - {obj.income_category.name if obj.income_category else 'General'}"
            ),
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to sync journal entry for other income {instance.id}: {e}")


@receiver(pre_save, sender=ShopRentalPayment)
def snapshot_rental_payment_for_accounting(sender, instance, **kwargs):
    if not instance.pk:
        instance._accounting_previous = None
        return
    previous = sender.objects.filter(pk=instance.pk).values('payment_status').first()
    instance._accounting_previous = previous


@receiver(post_save, sender=ShopRentalPayment)
def create_rental_payment_journal(sender, instance, created, **kwargs):
    """Create journal entry when rental payment is created or marked as completed
    
    This uses the accrual method:
    1. Creates accrual entry for the months being paid (Dr Rental Receivable, Cr Rental Income)
    2. Records the payment (Dr Cash, Cr Rental Receivable)
    """
    should_journal = (
        (created and instance.payment_status == 'completed') or
        (
            not created and
            getattr(instance, '_accounting_previous', None) and
            instance._accounting_previous.get('payment_status') != 'completed' and
            instance.payment_status == 'completed'
        )
    )

    if should_journal:
        try:
            # Get period info from the payment
            period_months = instance.period_months or []
            period_year = instance.period_year or str(timezone.now().year)
            
            if not period_months:
                # Fallback to old behavior if no period info
                AccountingService.record_rental_payment(
                    tenant_name=instance.rental.tenant.full_name,
                    amount=instance.amount,
                    date=instance.payment_date,
                    reference=instance.reference_number,
                    rental_id=instance.rental.id
                )
            else:
                # Use the new accrual method
                AccountingService.record_rental_payment_with_accrual(
                    rental_id=instance.rental.id,
                    tenant_name=instance.rental.tenant.full_name,
                    amount=instance.amount,
                    date=instance.payment_date,
                    period_months=period_months,
                    period_year=period_year,
                    currency=instance.currency,
                    reference=instance.reference_number
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for rental payment {instance.id}: {e}")
