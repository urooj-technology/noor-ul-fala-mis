from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db import transaction
from django.utils import timezone
from api.models.data.student import Student, CLASS_LEVEL_CHOICES
from api.models.data.student_finance import StudentFeeAssignment, STUDENT_DEFAULT_CURRENCY
from api.serializers.data.student import StudentSerializer
from api.views.data.base import DataRootViewSet
from api.utils.registration_dates import get_registration_date_range
from decimal import Decimal
from rest_framework import status as drf_status


class StudentViewSet(DataRootViewSet):
    permission_module = 'students'
    action_permissions = {
        'financial_summary': 'view_students',
        'by_level': 'view_students',
        'statistics': 'view_students',
        'total_payment': 'view_students',
        'bulk_change_class': 'edit_students',
    }
    queryset = Student.objects.all().order_by('-registration_date')
    serializer_class = StudentSerializer
    filterset_fields = ['status', 'gender', 'class_level']
    search_fields = [
        'full_name', 'father_name', 'grandfather_name',
        'registration_number', 'tazkira_number',
        'parent_phone', 'student_phone', 'alternative_phone'
    ]

    def perform_create(self, serializer):
        """Create student without auto-creating class-based fee assignments or payment plan.
        Class-level default fees and `PaymentPlan` model were removed; assignments should
        be created explicitly via the `student-fee-assignments/` API and per-assignment
        `payment_plan` number is stored on each assignment.
        """
        student = serializer.save()
        return student

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        # Filter by class_level
        class_level = self.request.query_params.get('class_level')
        if class_level:
            queryset = queryset.filter(class_level=class_level)

        # Filter by list of IDs (for bulk operations)
        id_in = self.request.query_params.get('id__in')
        if id_in:
            ids = [int(i) for i in id_in.split(',') if i.strip().isdigit()]
            queryset = queryset.filter(id__in=ids)

        registration_period = self.request.query_params.get('registration_period')
        if registration_period:
            date_from = self.request.query_params.get('registration_date_from')
            date_to = self.request.query_params.get('registration_date_to')
            start_date, end_date = get_registration_date_range(
                registration_period, date_from, date_to
            )
            if start_date and end_date:
                queryset = queryset.filter(
                    registration_date__gte=start_date,
                    registration_date__lte=end_date,
                )
            elif registration_period == 'custom':
                queryset = queryset.none()

        return queryset

    def list(self, request, *args, **kwargs):
        """Return all matching students without pagination when filtering by registration period."""
        if request.query_params.get('registration_period'):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'count': queryset.count(),
                'results': serializer.data,
            })
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def financial_summary(self, request, pk=None):
        """FIXED: Get student financial summary with Decimal-safe output.
        
        Query params:
            class_level: Optional - get finances for a specific class level.
                        If not provided, uses student's current class_level.
        """
        student = self.get_object()
        class_level_param = request.query_params.get('class_level')
        
        # Use the class_level parameter if provided, otherwise use student's current class_level
        class_level = class_level_param if class_level_param and class_level_param != 'all' else student.class_level
        
        summary = student.get_financial_summary(class_level=class_level)

        def decimal_to_str(val):
            if isinstance(val, str):
                return val
            return str(val)

        return Response({
            'student_id': student.id,
            'student_name': student.full_name,
            'registration_number': student.registration_number,
            'total_fee': decimal_to_str(summary.get('total_invoices', '0')),
            'total_payments': decimal_to_str(summary.get('total_payments', '0')),
            'total_invoices': decimal_to_str(summary.get('total_invoices', '0')),
            'total_paid_invoices': decimal_to_str(summary.get('total_paid_invoices', '0')),
            'remaining_balance': decimal_to_str(summary.get('remaining_balance', '0')),
            'registration_number': summary.get('registration_number'),
            'status': summary.get('status'),
            'class_level': summary.get('class_level'),
            'class_level_id': summary.get('class_level_id'),
            'by_fee_type': summary.get('by_fee_type', {}),
        })

    @action(detail=False, methods=['get'])
    def by_level(self, request):
        """
        Get all students for a specific class level
        URL: /api/students/by_level/?level=<level_value>
        """
        level_value = request.query_params.get('level')
        
        if not level_value:
            return Response({'error': 'level parameter is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Validate the level value
        valid_levels = [choice[0] for choice in CLASS_LEVEL_CHOICES]
        if level_value not in valid_levels:
            return Response({'error': 'Invalid class level'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Get all students for this level
        students = Student.objects.filter(
            class_level=level_value,
            status='active'
        ).order_by('full_name')
        
        serializer = self.get_serializer(students, many=True)
        
        return Response({
            'level': {
                'id': level_value,
                'name': dict(CLASS_LEVEL_CHOICES).get(level_value, level_value),
                'level': level_value
            },
            'students': serializer.data,
            'count': students.count()
        })
    
    @action(detail=False, methods=['get'])
    def outstanding_report(self, request):
        """Aggregated outstanding (remaining) balances for all students.

        Optional query params:
            status: filter by student status (e.g. active)
            class_level: filter by class level
            payment_status: paid | unpaid | partial
                - paid: remaining == 0 and paid > 0 (fully paid)
                - unpaid: paid == 0 and remaining > 0 (no payments yet)
                - partial: paid > 0 and remaining > 0 (some paid, some remaining)
        Returns per-student rows plus totals grouped by currency and grand totals.
        """
        queryset = Student.objects.all()

        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        class_level = request.query_params.get('class_level')
        if class_level:
            queryset = queryset.filter(class_level=class_level)

        payment_status = (request.query_params.get('payment_status') or '').strip().lower()
        valid_payment_statuses = {'paid', 'unpaid', 'partial'}
        if payment_status and payment_status not in valid_payment_statuses:
            return Response(
                {'error': 'payment_status must be one of: paid, unpaid, partial'},
                status=400,
            )

        rows = []
        totals_by_currency = {}
        grand_expected = Decimal('0')
        grand_paid = Decimal('0')
        grand_remaining = Decimal('0')

        def dec(val):
            return Decimal(str(val)) if not isinstance(val, Decimal) else val

        def classify_payment(paid_amt, remaining_amt):
            if paid_amt > 0 and remaining_amt <= 0:
                return 'paid'
            if paid_amt <= 0 and remaining_amt > 0:
                return 'unpaid'
            if paid_amt > 0 and remaining_amt > 0:
                return 'partial'
            return 'none'

        for student in queryset.order_by('full_name'):
            summary = student.get_financial_summary()
            expected = dec(summary.get('total_invoices', '0'))
            paid = dec(summary.get('total_payments', '0'))
            remaining = dec(summary.get('remaining_balance', '0'))
            balance_status = classify_payment(paid, remaining)

            if payment_status and balance_status != payment_status:
                continue

            # Student has no direct currency field; derive it from fee assignments
            assignment_currency = StudentFeeAssignment.objects.filter(
                student=student, is_active=True
            ).exclude(currency__isnull=True).exclude(currency='').values_list('currency', flat=True).first()
            currency = assignment_currency or STUDENT_DEFAULT_CURRENCY

            rows.append({
                'student_id': student.id,
                'registration_number': student.registration_number,
                'student_name': student.full_name,
                'class_level': summary.get('class_level'),
                'class_level_id': summary.get('class_level_id'),
                'status': student.status,
                'fee_type': student.fee_type,
                'payment_status': balance_status,
                'total_expected': str(expected),
                'total_paid': str(paid),
                'remaining_balance': str(remaining),
                'currency': currency,
            })

            bucket = totals_by_currency.setdefault(currency, {
                'currency': currency,
                'total_expected': Decimal('0'),
                'total_paid': Decimal('0'),
                'remaining_balance': Decimal('0'),
                'student_count': 0,
            })
            bucket['total_expected'] += expected
            bucket['total_paid'] += paid
            bucket['remaining_balance'] += remaining
            bucket['student_count'] += 1

            grand_expected += expected
            grand_paid += paid
            grand_remaining += remaining

        totals_by_currency_list = []
        for currency, bucket in totals_by_currency.items():
            totals_by_currency_list.append({
                'currency': currency,
                'total_expected': str(bucket['total_expected']),
                'total_paid': str(bucket['total_paid']),
                'remaining_balance': str(bucket['remaining_balance']),
                'student_count': bucket['student_count'],
            })

        return Response({
            'count': len(rows),
            'results': rows,
            'totals_by_currency': totals_by_currency_list,
            'grand_totals': {
                'total_expected': str(grand_expected),
                'total_paid': str(grand_paid),
                'remaining_balance': str(grand_remaining),
                'student_count': len(rows),
            },
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get student statistics"""
        total_students = Student.objects.count()
        active_students = Student.objects.filter(status='active').count()
        inactive_students = Student.objects.filter(status='inactive').count()
        graduated_students = Student.objects.filter(status='graduated').count()

        # Students by status
        students_by_status = Student.objects.values('status').annotate(
            count=Count('id')
        )

        return Response({
            'total_students': total_students,
            'active_students': active_students,
            'inactive_students': inactive_students,
            'graduated_students': graduated_students,
            'students_by_status': list(students_by_status)
        })

    @action(detail=False, methods=['get'])
    def total_payment(self, request):
        """Get student's total paid and remaining balance"""
        student_id = request.query_params.get('student')
        
        if not student_id:
            return Response({'error': 'student parameter is required'}, status=400)
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        
        # Get total expected from assignments
        expected = student.effective_fee
        
        # Get total paid from payments
        total_paid = student.get_total_payments()
        
        # Calculate remaining
        remaining = max(expected - total_paid, Decimal('0'))
        
        return Response({
            'student_id': student.id,
            'student_name': student.full_name,
            'total_expected': str(expected),
            'total_paid': str(total_paid),
            'remaining_balance': str(remaining),
            'currency': student.currency,
        })

    @action(detail=False, methods=['post'])
    def bulk_change_class(self, request):
        """Bulk update class_level for multiple students"""
        student_ids = request.data.get('student_ids', [])
        class_level_value = request.data.get('class_level')

        if not student_ids or not isinstance(student_ids, list) or len(student_ids) == 0:
            return Response(
                {'error': 'student_ids must be a non-empty list'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if not class_level_value:
            return Response(
                {'error': 'class_level is required'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        # Validate the class level value
        valid_levels = [choice[0] for choice in CLASS_LEVEL_CHOICES]
        if class_level_value not in valid_levels:
            return Response(
                {'error': 'Invalid class level'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        # Fetch and update students
        students = Student.objects.filter(id__in=student_ids)
        updated_count = students.update(class_level=class_level_value)

        # Return updated students
        updated_students = Student.objects.filter(id__in=student_ids)
        serializer = StudentSerializer(updated_students, many=True)

        return Response({
            'updated_count': updated_count,
            'class_level': {
                'id': class_level_value,
                'name': dict(CLASS_LEVEL_CHOICES).get(class_level_value, class_level_value),
                'level': class_level_value
            },
            'students': serializer.data,
        })