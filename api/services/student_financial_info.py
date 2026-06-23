from decimal import Decimal

from django.db.models import Sum

from api.models.data.student import CLASS_LEVEL_CHOICES, Student
from api.models.data.student_finance import StudentFeeAssignment, StudentPayment

TRANSPORTATION_LABELS = dict(Student.TRANSPORTATION_CHOICES)


def build_student_financial_info(student, class_level=None):
    """Build financial summary for print/export. Defaults to student's current class level."""
    effective_level = class_level if class_level and class_level != 'all' else student.class_level

    assignments_qs = StudentFeeAssignment.objects.filter(student=student, is_active=True)
    if effective_level:
        assignments_qs = assignments_qs.filter(class_level=effective_level)
    assignments = list(assignments_qs.select_related('fee_type').order_by('fee_type__name'))

    total_fee = sum(a.amount or Decimal('0') for a in assignments)

    payments_qs = StudentPayment.completed().filter(assignment__student=student)
    if effective_level:
        payments_qs = payments_qs.filter(assignment__class_level=effective_level)
    total_paid = payments_qs.aggregate(total_paid=Sum('amount'))['total_paid'] or Decimal('0')

    remaining = total_fee - total_paid
    if remaining < 0:
        remaining = Decimal('0')

    fee_breakdown = []
    for assignment in assignments:
        paid_for_assignment = StudentPayment.completed().filter(
            assignment=assignment,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        fee_breakdown.append({
            'fee_type_id': assignment.fee_type_id,
            'fee_type': assignment.fee_type.name if assignment.fee_type else 'Unknown',
            'fee_category': assignment.fee_type.category if assignment.fee_type else 'other',
            'amount': str(assignment.amount or '0'),
            'currency': assignment.currency,
            'is_mandatory': assignment.is_mandatory,
            'paid_amount': str(paid_for_assignment),
            'remaining_amount': str(max(Decimal('0'), (assignment.amount or Decimal('0')) - paid_for_assignment)),
            'class_level': assignment.class_level,
            'class_level_name': dict(CLASS_LEVEL_CHOICES).get(assignment.class_level, assignment.class_level) if assignment.class_level else None,
        })

    class_level_name = dict(CLASS_LEVEL_CHOICES).get(effective_level, effective_level) if effective_level else None

    return {
        'student_id': student.id,
        'student_name': student.full_name,
        'registration_number': student.registration_number,
        'current_address': student.current_address,
        'transportation': student.transportation,
        'transportation_display': TRANSPORTATION_LABELS.get(student.transportation, student.transportation),
        'phone': student.parent_phone,
        'currency': assignments[0].currency if assignments else 'AFN',
        'class_level': class_level_name,
        'class_level_id': effective_level,
        'total_fee': str(total_fee),
        'total_paid': str(total_paid),
        'remaining_amount': str(remaining),
        'is_paid': total_paid >= total_fee and total_fee > 0,
        'payment_percentage': float((total_paid / total_fee * 100) if total_fee > 0 else 0),
        'total_payment_count': payments_qs.count(),
        'fee_breakdown': fee_breakdown,
    }
