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
        'amount', 'currency', 'payment_status'
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
                AccountingService.record_student_fee_assignment(
                    assignment=instance,
                    amount=current_amount,
                    reference=f"FEE-ASSIGN-{instance.id}",
                )
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
        currency = instance.currency or DEFAULT_CURRENCY

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
        previous_currency = previous.get('currency') or DEFAULT_CURRENCY

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
                currency=previous.get('currency') or currency
            )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create journal entry for student payment {instance.id}: {e}")


@receiver(post_save, sender=Expense)
def create_expense_journal(sender, instance, created, **kwargs):
    """Create journal entry when expense is created"""
    if created:
        try:
            from api.models.data.accounting import Account
            
            currency = instance.currency or 'AFN'
            category_name = instance.category.name.lower() if instance.category else ''
            
            # Determine expense account based on category name
            expense_account = None
            if 'salary' in category_name or 'wage' in category_name:
                expense_account = Account.objects.filter(code=f'5000_{currency}').first()
            else:
                # Default to Other Expenses for all other categories
                expense_account = Account.objects.filter(code=f'5900_{currency}').first()
            
            if not expense_account:
                expense_account = Account.objects.filter(code=f'5900_{currency}').first()
            
            cash_account = Account.objects.filter(code=f'1000_{currency}').first()
            
            if not cash_account or not expense_account:
                raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")
            
            AccountingService.create_journal_entry(
                date=instance.expense_date,
                description=f"Expense - {instance.category.name}: {instance.description or ''}",
                lines=[
                    {'account_id': expense_account.id, 'debit': instance.amount, 'credit': 0},
                    {'account_id': cash_account.id, 'debit': 0, 'credit': instance.amount}
                ],
                transaction_type='expense',
                reference=f"EXPENSE-{instance.id}"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for expense {instance.id}: {e}")


@receiver(post_save, sender=Payroll)
def create_payroll_journal(sender, instance, created, **kwargs):
    """Create journal entry when payroll is created"""
    if created:
        try:
            AccountingService.record_payroll(
                employee_name=instance.employee.full_name,
                amount=instance.salary,
                date=instance.payment_date,
                reference=f"PAYROLL-{instance.id}"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for payroll {instance.id}: {e}")


@receiver(post_save, sender=Advance)
def create_advance_journal(sender, instance, created, **kwargs):
    """Create journal entry when advance is created"""
    if created:
        try:
            AccountingService.record_advance(
                employee_name=instance.employee.full_name,
                amount=instance.amount,
                date=instance.payment_date,
                reference=f"ADVANCE-{instance.id}"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for advance {instance.id}: {e}")


@receiver(post_save, sender=OtherIncome)
def create_other_income_journal(sender, instance, created, **kwargs):
    """Create journal entry when other income is created"""
    if created:
        try:
            from api.models.data.accounting import Account
            currency = instance.currency if instance.currency else 'AFN'
            AccountingService.create_journal_entry(
                date=instance.income_date,
                description=f"Other Income - {instance.income_category.name if instance.income_category else 'General'} - {instance.source or 'N/A'}",
                lines=[
                    {'account_id': Account.objects.get(code=f'1000_{currency}').id, 'debit': instance.amount, 'credit': 0},
                    {'account_id': Account.objects.get(code=f'4300_{currency}').id, 'debit': 0, 'credit': instance.amount}
                ],
                transaction_type='other_income',
                reference=f"INCOME-{instance.id}"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for other income {instance.id}: {e}")


@receiver(post_save, sender=ShopRentalPayment)
def create_rental_payment_journal(sender, instance, created, **kwargs):
    """Create journal entry when rental payment is created or marked as completed
    
    This uses the accrual method:
    1. Creates accrual entry for the months being paid (Dr Rental Receivable, Cr Rental Income)
    2. Records the payment (Dr Cash, Cr Rental Receivable)
    """
    # Create journal entry when payment is created and status is completed
    if created and instance.payment_status == 'completed':
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
    
    # Create journal entry when payment status changes to completed
    if not created:
        try:
            old_instance = ShopRentalPayment.objects.get(pk=instance.pk)
            if old_instance.payment_status != 'completed' and instance.payment_status == 'completed':
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
        except ShopRentalPayment.DoesNotExist:
            pass
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for rental payment {instance.id}: {e}")
