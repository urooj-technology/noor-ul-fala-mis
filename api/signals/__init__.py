from django.db.models.signals import post_save, post_delete
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


@receiver(post_save, sender=StudentFeeAssignment)
def create_fee_assignment_journal(sender, instance, created, **kwargs):
    """Create journal entry when fee is assigned to a student (Accounts Receivable)"""
    if created:
        try:
            student = instance.student
            currency = instance.currency
            
            # Get accounts for this currency
            from api.models.data.accounting import Account
            receivable_account = Account.objects.filter(code=f'1200_{currency}').first()
            revenue_account = Account.objects.filter(code=f'4000_{currency}').first()
            
            if not receivable_account or not revenue_account:
                raise ValueError(f"Default accounts not configured for {currency}. Please run init_chart_of_accounts.")
            
            fee_type_name = instance.fee_type.name if instance.fee_type else 'Fee'
            class_level_name = instance.class_level.name if instance.class_level else ''
            
            AccountingService.create_journal_entry(
                date=timezone.now().date(),
                description=f"Fee Assignment - {student.full_name} - {fee_type_name} ({class_level_name})",
                lines=[
                    {'account_id': receivable_account.id, 'debit': instance.amount, 'credit': 0},
                    {'account_id': revenue_account.id, 'debit': 0, 'credit': instance.amount}
                ],
                transaction_type='student_payment',
                reference=f"FEE-ASSIGN-{instance.id}"
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for fee assignment {instance.id}: {e}")


@receiver(post_save, sender=StudentPayment)
def create_student_payment_journal(sender, instance, created, **kwargs):
    """Create journal entry when student payment is created or marked as completed"""
    # Create journal entry when payment is created and status is completed
    if created and instance.payment_status == 'completed':
        try:
            student_obj = instance.assignment.student if instance.assignment and instance.assignment.student else None
            if student_obj:
                AccountingService.record_student_payment(
                    student_id=student_obj.id,
                    amount=instance.amount,
                    date=instance.payment_date,
                    description=f"{student_obj.full_name}",
                    reference=instance.reference_number,
                    payment_cycle='interval',
                    currency=instance.currency or 'AFN'
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for student payment {instance.id}: {e}")
    
    # Create journal entry when payment status changes to completed
    if not created:
        try:
            old_instance = StudentPayment.objects.get(pk=instance.pk)
            if old_instance.payment_status != 'completed' and instance.payment_status == 'completed':
                student_obj = instance.assignment.student if instance.assignment and instance.assignment.student else None
                if student_obj:
                    AccountingService.record_student_payment(
                        student_id=student_obj.id,
                        amount=instance.amount,
                        date=instance.payment_date,
                        description=f"{student_obj.full_name}",
                        reference=instance.reference_number,
                        payment_cycle='interval',
                        currency=instance.currency or 'AFN'
                    )
        except StudentPayment.DoesNotExist:
            pass
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
    """Create journal entry when rental payment is created or marked as completed"""
    # Create journal entry when payment is created and status is completed
    if created and instance.payment_status == 'completed':
        try:
            AccountingService.record_rental_payment(
                tenant_name=instance.rental.tenant.full_name,
                amount=instance.amount,
                date=instance.payment_date,
                reference=instance.reference_number,
                rental_id=instance.rental.id
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
                AccountingService.record_rental_payment(
                    tenant_name=instance.rental.tenant.full_name,
                    amount=instance.amount,
                    date=instance.payment_date,
                    reference=instance.reference_number,
                    rental_id=instance.rental.id
                )
        except ShopRentalPayment.DoesNotExist:
            pass
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create journal entry for rental payment {instance.id}: {e}")