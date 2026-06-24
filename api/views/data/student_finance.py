"""
Student Finance Views - All fee and payment-related views
ویوهای مالی شاگرد - همه ویوهای مربوط به فیس و پرداخت

Views included:
- FeeTypeViewSet
- ClassFeeViewSet (removed: ClassFee model deleted)
- StudentFeeAssignmentViewSet
- PaymentPlanViewSet (removed: PaymentPlan model deleted)
- StudentPaymentViewSet
- FinanceLedgerViewSet
"""
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from rest_framework import status as drf_status

from api.models.data.student_finance import (
    FeeType, StudentFeeAssignment, StudentPayment, FinanceLedger
)
from api.models.data.student import Student, CLASS_LEVEL_CHOICES
from api.serializers.data.student_finance import (
    FeeTypeSerializer, FeeTypeMinimalSerializer,
    StudentFeeAssignmentSerializer, StudentPaymentSerializer, FinanceLedgerSerializer
)
from api.views.data.base import DataRootViewSet
from api.services.student_financial_info import build_student_financial_info
from api.utils.excel_export import export_to_excel


class FeeTypeViewSet(DataRootViewSet):
    """API endpoint for FeeType management | مدیریت انواع فیس"""
    permission_module = 'students'
    queryset = FeeType.objects.all().order_by('name')
    serializer_class = FeeTypeSerializer
    filterset_fields = ['is_active', 'is_mandatory', 'category']
    search_fields = ['name', 'name_fa', 'name_ps', 'code', 'description']


# Class-level default fees removed: ClassFee endpoints intentionally omitted


class StudentFeeAssignmentViewSet(DataRootViewSet):
    """API endpoint for StudentFeeAssignment management | مدیریت تخصیص فیس شاگردان"""
    permission_module = 'students'
    action_permissions = {
        'by_student': 'view_students',
        'fee_assignment_data': 'view_students',
        'bulk_assign_fees': 'edit_students',
    }
    queryset = StudentFeeAssignment.objects.all().select_related('student', 'fee_type')
    serializer_class = StudentFeeAssignmentSerializer
    filterset_fields = ['student', 'fee_type', 'is_active', 'is_mandatory', 'class_level']
    search_fields = ['student__full_name', 'student__registration_number', 'fee_type__name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        class_level = self.request.query_params.get('class_level')
        if class_level:
            queryset = queryset.filter(class_level=class_level)
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_student(self, request):
        """Get all fee assignments for a specific student | فیسهای یک شاگرد"""
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'student parameter is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        assignments = self.queryset.filter(student_id=student_id, is_active=True)
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)
    
    # Class-based auto-assignment removed. Create assignments via student-fee-assignments API.
    
    @action(detail=False, methods=['get'])
    def fee_assignment_data(self, request):
        """
        Get all data needed for fee assignment in one request.
        Returns: fee types, class level assigned fees, and student's existing assignments.
        """
        class_level = request.query_params.get('class_level')
        student_id = request.query_params.get('student')
        
        # Get all active fee types
        fee_types_qs = FeeType.objects.filter(is_active=True).order_by('name')
        fee_types = []
        for ft in fee_types_qs:
            fee_types.append({
                'id': ft.id,
                'name': ft.name,
                'code': ft.code,
                'category': ft.category,
                'is_mandatory': ft.is_mandatory,
            })
        
        # Get all active fee assignments for this class level
        class_assignments_qs = StudentFeeAssignment.objects.filter(
            class_level=class_level,
            is_active=True
        ).select_related('fee_type', 'student') if class_level else []
        
        # Group by fee_type with assignment count and amounts
        from collections import Counter
        fee_type_map = {}
        for a in class_assignments_qs:
            if a.fee_type_id not in fee_type_map:
                fee_type_map[a.fee_type_id] = {
                    'fee_type_id': a.fee_type_id,
                    'assignment_count': 0,
                    'amounts': [],
                }
            fee_type_map[a.fee_type_id]['assignment_count'] += 1
            fee_type_map[a.fee_type_id]['amounts'].append(a.amount)
        
        # Calculate most common amount for each fee type
        class_level_fees = {}
        for ft_id, data in fee_type_map.items():
            amount_counts = Counter(data['amounts'])
            most_common_amount = amount_counts.most_common(1)[0][0] if amount_counts else Decimal('0')
            class_level_fees[ft_id] = {
                'assignment_count': data['assignment_count'],
                'suggested_amount': str(most_common_amount),
            }
        
        # Get student's existing assignments if student_id provided
        student_assignments = []
        if student_id:
            try:
                student = Student.objects.get(id=student_id)
                # Filter by class_level if provided to get level-specific assignments
                student_assignments_qs = StudentFeeAssignment.objects.filter(
                    student=student,
                    is_active=True
                ).select_related('fee_type')
                
                # If class_level is provided, only get assignments for that level
                if class_level:
                    student_assignments_qs = student_assignments_qs.filter(class_level=class_level)
                
                for a in student_assignments_qs:
                    student_assignments.append({
                        'id': a.id,
                        'fee_type_id': a.fee_type_id,
                        'amount': str(a.amount),
                        'currency': a.currency,
                        'payment_plan': a.payment_plan,
                        'class_level': a.class_level,
                        'class_level_name': dict(CLASS_LEVEL_CHOICES).get(a.class_level, a.class_level) if a.class_level else None,
                    })
            except Student.DoesNotExist:
                pass
        
        return Response({
            'fee_types': fee_types,
            'class_level_fees': class_level_fees,
            'student_assignments': student_assignments,
        })

    @action(detail=False, methods=['post'])
    def bulk_assign_fees(self, request):
        """
        Bulk create fee assignments for a student.
        Request body:
        {
            "student": student_id,
            "class_level": class_level,
            "currency": "AFN",
            "payment_plan": 1,
            "assignments": [
                {"fee_type": 1, "amount": "1000"},
                {"fee_type": 2, "amount": "500"},
                ...
            ]
        }
        """
        student_id = request.data.get('student')
        class_level = request.data.get('class_level')
        currency = request.data.get('currency', 'AFN')
        payment_plan = request.data.get('payment_plan', 1)
        assignments_data = request.data.get('assignments', [])

        if not student_id:
            return Response(
                {'error': 'student is required'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if not assignments_data:
            return Response(
                {'error': 'assignments must be a non-empty list'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=drf_status.HTTP_404_NOT_FOUND
            )

        created_assignments = []
        errors = []

        with transaction.atomic():
            for idx, item in enumerate(assignments_data):
                fee_type_id = item.get('fee_type')
                amount = item.get('amount')

                if not fee_type_id or not amount:
                    errors.append(f"Assignment {idx + 1}: fee_type and amount are required")
                    continue

                try:
                    fee_type = FeeType.objects.get(id=fee_type_id, is_active=True)
                except FeeType.DoesNotExist:
                    errors.append(f"Assignment {idx + 1}: Fee type {fee_type_id} not found or inactive")
                    continue

                try:
                    amount_dec = Decimal(str(amount))
                    if amount_dec <= 0:
                        errors.append(f"Assignment {idx + 1}: Amount must be positive")
                        continue
                except Exception:
                    errors.append(f"Assignment {idx + 1}: Invalid amount")
                    continue

                # Check if assignment already exists for this student+fee_type+class_level
                existing = StudentFeeAssignment.objects.filter(
                    student=student,
                    fee_type=fee_type,
                    class_level=class_level if class_level else None,
                    is_active=True
                ).first()

                if existing:
                    # Update existing
                    existing.amount = amount_dec
                    existing.currency = currency
                    existing.payment_plan = payment_plan
                    existing.save()
                    created_assignments.append(existing)
                else:
                    # Create new with class_level
                    assignment = StudentFeeAssignment.objects.create(
                        student=student,
                        fee_type=fee_type,
                        amount=amount_dec,
                        currency=currency,
                        payment_plan=payment_plan,
                        class_level=class_level if class_level else student.class_level,
                        is_active=True,
                        is_mandatory=fee_type.is_mandatory,
                    )
                    created_assignments.append(assignment)

        serializer = StudentFeeAssignmentSerializer(
            created_assignments, many=True, context={'request': request}
        )

        return Response({
            'success': True,
            'message': f'{len(created_assignments)} fee assignment(s) created/updated',
            'created_count': len(created_assignments),
            'errors': errors,
            'assignments': serializer.data,
        }, status=drf_status.HTTP_201_CREATED)


# StudentInvoice endpoints removed — invoices and ledger are deprecated. Use StudentFeeAssignment and StudentPayment instead.


class StudentPaymentViewSet(DataRootViewSet):
    """API endpoint for StudentPayment management | مدیریت پرداخت شاگردان"""
    permission_module = 'student_payments'
    action_permissions = {
        'daily_summary': 'view_student_payments',
        'monthly_summary': 'view_student_payments',
        'mark_as_paid': 'edit_student_payments',
        'mark_as_refunded': 'edit_student_payments',
        'create_payments_for_assignments': 'create_student_payments',
        'financial_info': 'view_student_payments',
        'bulk_financial_info': 'view_students',
        'bulk_financial_export': 'export_reports',
        'student_fee_assignments': 'view_students',
        'student_fee_assignments_with_months': 'view_students',
        'fee_assignment_data': 'view_students',
        'bulk_assign_fees': 'edit_students',
        'create_payments': 'create_student_payments',
    }
    queryset = StudentPayment.objects.all().order_by('-payment_date')
    serializer_class = StudentPaymentSerializer
    filterset_fields = ['assignment', 'payment_status', 'payment_date']
    search_fields = [
        'assignment__student__full_name', 'assignment__student__registration_number',
        'reference_number', 'description'
    ]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        student = self.request.query_params.get('student')
        if student:
            queryset = queryset.filter(assignment__student_id=student)
        
        # REMOVED: payment_cycle filter - using payment_interval_months instead
        
        status = self.request.query_params.get('payment_status')
        if status:
            queryset = queryset.filter(payment_status=status)
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create payments for selected period months with flexible allocation modes.

        Supported request payloads:
        - allocation_mode: 'all' (default) or 'per_fee'
        - period_months: list of month numbers (strings or ints)
        - period_year: year string
        - amount: total amount (for 'all') or ignored when 'per_fee' and allocations provided
        - allocations: JSON string or dict mapping fee_type_id -> amount (used when allocation_mode='per_fee' or to override split)
        - fee_type: legacy single fee_type selector (still supported)

        Behavior:
        - When allocation_mode='per_fee' and allocations provided, creates payments per fee type per selected month using provided amounts.
        - When allocation_mode='all', splits the provided total amount proportionally across active assignments amounts, then creates per-fee payments per month.
        - Enforces each assignment.payment_plan: selected months count must not exceed the assignment's payment_plan.
        """
        import json

        # Prefer explicit assignment id; fallback to student+fee_type filtering
        assignment_id = request.data.get('assignment')
        fee_type_id = request.data.get('fee_type')  # optional single fee_type

        student = None
        assignment_obj = None
        if assignment_id:
            try:
                assignment_obj = StudentFeeAssignment.objects.select_related('student', 'fee_type').get(id=assignment_id, is_active=True)
                student = assignment_obj.student
            except StudentFeeAssignment.DoesNotExist:
                return Response({'error': 'Assignment not found'}, status=drf_status.HTTP_404_NOT_FOUND)
        else:
            student_id = request.data.get('student')
            if not student_id:
                return Response({'error': 'Either assignment or student is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                return Response({'error': 'Student not found'}, status=drf_status.HTTP_404_NOT_FOUND)

        # Normalize fee_type
        if fee_type_id == '' or fee_type_id == 'null' or fee_type_id == 'undefined':
            fee_type_id = None

        # Parse period_months
        period_months = request.data.get('period_months') or []
        if isinstance(period_months, str):
            try:
                period_months = json.loads(period_months)
            except Exception:
                period_months = [period_months]

        # if empty, default to current month
        if not period_months:
            period_months = [str(timezone.now().month).zfill(2)]

        # Normalize months to zfilled strings
        norm_months = []
        for m in period_months:
            try:
                mi = int(m)
                if mi < 1 or mi > 12:
                    raise ValueError()
                norm_months.append(str(mi).zfill(2))
            except Exception:
                continue
        
        # Use provided period_month if period_months not provided
        if not norm_months and request.data.get('period_month'):
            try:
                pm = int(request.data.get('period_month'))
                if 1 <= pm <= 12:
                    norm_months = [str(pm).zfill(2)]
            except (ValueError, TypeError):
                pass
        
        # Default to current month if still no months
        if not norm_months:
            norm_months = [str(timezone.now().month).zfill(2)]
        
        if not norm_months:
            return Response({'error': 'No valid period_months provided (1-12 expected).'}, status=drf_status.HTTP_400_BAD_REQUEST)

        # Load allocation mode and allocations
        allocation_mode = request.data.get('allocation_mode', 'all')
        allocations_raw = request.data.get('allocations')
        allocations = None
        if allocations_raw:
            if isinstance(allocations_raw, str):
                try:
                    allocations = json.loads(allocations_raw)
                except Exception:
                    allocations = None
            elif isinstance(allocations_raw, dict):
                allocations = allocations_raw

        # Validate using serializer for common fields (currency, payment_date, payment_status, reference, description)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        period_year = request.data.get('period_year', str(timezone.now().year))

        # Retrieve assignments for this student (or use provided assignment)
        class_level = request.data.get('class_level')
        if assignment_obj:
            assignments = [assignment_obj]
        else:
            assignments_qs = StudentFeeAssignment.objects.filter(student=student, is_active=True)
            if class_level and class_level != 'all':
                assignments_qs = assignments_qs.filter(class_level=class_level)
            assignments = list(assignments_qs.select_related('fee_type'))

        # Helper: check payment_plan limits per assignment for the selected months
        months_count = len(norm_months)
        for assignment in assignments:
            if assignment.payment_plan and months_count > assignment.payment_plan:
                return Response({'error': f'Assignment for fee {assignment.fee_type.name} allows at most {assignment.payment_plan} month(s). You selected {months_count}.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        created_payments = []

        # If allocation_mode == 'per_fee' and allocations provided, use those amounts
        if allocation_mode == 'per_fee' and allocations:
            # allocations expected as { fee_type_id: amount }
            for ft_id_str, amt in allocations.items():
                try:
                    ft_id = int(ft_id_str)
                    amt_dec = Decimal(str(amt))
                except Exception:
                    continue

                # Verify assignment exists for this fee_type
                # match by fee_type or by assignment id
                assignment = next((a for a in assignments if a.fee_type_id == ft_id or str(a.id) == str(ft_id)), None)
                if not assignment:
                    return Response({'error': f'No active assignment for fee_type {ft_id} for this student.'}, status=drf_status.HTTP_400_BAD_REQUEST)

                # For each month create a payment entry for this fee_type
                for month_str in norm_months:
                    payment = StudentPayment.objects.create(
                        assignment=assignment,
                        amount=amt_dec,
                        currency=serializer.validated_data.get('currency', assignment.currency),
                        payment_date=serializer.validated_data.get('payment_date', timezone.now().date()),
                        payment_status=serializer.validated_data.get('payment_status', 'completed'),
                        period_year=str(period_year),
                        period_month=month_str,
                        fee_type_id=ft_id,
                        reference_number=serializer.validated_data.get('reference_number', ''),
                        description=serializer.validated_data.get('description', ''),
                    )
                    created_payments.append(payment)

        else:
            # allocation_mode == 'all' (default) or no allocations provided: split total amount across assignments
            total_amount = serializer.validated_data.get('amount', Decimal('0'))
            if total_amount <= 0:
                return Response({'error': 'amount must be provided and greater than zero when using allocation_mode=all'}, status=drf_status.HTTP_400_BAD_REQUEST)

            # Compute weights based on assignment.amount (fallback to 1 if zero)
            weights = [a.amount if a.amount and a.amount > 0 else Decimal('1') for a in assignments]
            weight_sum = sum(weights) if weights else Decimal('0')
            if weight_sum == 0:
                # fallback: divide equally
                weights = [Decimal('1') for _ in assignments]
                weight_sum = Decimal(len(assignments))

            # Calculate per-assignment allocation (rounded to 2 decimals), distribute remainder to first
            per_assignment_alloc = []
            accumulated = Decimal('0')
            for idx, a in enumerate(assignments):
                alloc = (total_amount * (weights[idx] / weight_sum)).quantize(Decimal('0.01'))
                per_assignment_alloc.append((a, alloc))
                accumulated += alloc

            # Fix rounding remainder
            remainder = total_amount - accumulated
            if remainder != 0 and per_assignment_alloc:
                a0, v0 = per_assignment_alloc[0]
                per_assignment_alloc[0] = (a0, (v0 + remainder).quantize(Decimal('0.01')))

            # Create payments per assignment per month
            for a, alloc_amt in per_assignment_alloc:
                for month_str in norm_months:
                    payment = StudentPayment.objects.create(
                        assignment=a,
                        amount=alloc_amt,
                        currency=serializer.validated_data.get('currency', a.currency),
                        payment_date=serializer.validated_data.get('payment_date', timezone.now().date()),
                        payment_status=serializer.validated_data.get('payment_status', 'completed'),
                        period_year=str(period_year),
                        period_month=month_str,
                        fee_type_id=a.fee_type_id,
                        reference_number=serializer.validated_data.get('reference_number', ''),
                        description=serializer.validated_data.get('description', ''),
                    )
                    created_payments.append(payment)

        # Return the first created payment for response
        response_serializer = self.get_serializer(created_payments[0] if created_payments else None)
        return Response(response_serializer.data, status=drf_status.HTTP_201_CREATED)
    
    # perform_create removed: ledger entries are deprecated with new assignment-based payments
    
    def update(self, request, *args, **kwargs):
        """Override update to handle fee_type properly"""
        # FIXED: Convert empty fee_type string to None
        fee_type = request.data.get('fee_type')
        if fee_type == '' or fee_type == 'null' or fee_type == 'undefined':
            request.data['fee_type'] = None
        
        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        """Update student payment and update invoice status"""
        # Get old fee_type before save
        old_fee_type_id = None
        if serializer.instance:
            old_fee_type_id = serializer.instance.fee_type_id
        
        # FIXED: Convert empty fee_type string to None before save
        fee_type = serializer.validated_data.get('fee_type')
        if fee_type == '' or fee_type == 'null' or fee_type == 'undefined':
            fee_type = None
        
        payment = serializer.save()
        
        # No ledger or invoice allocation performed here under the new model
    
    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get daily payment summary | خلاصه روزانه پرداختها"""
        date = request.query_params.get('date', timezone.now().date().isoformat())
        summary = StudentPayment.active().filter(payment_date=date).aggregate(
            total_amount=Sum('amount'), count=Count('id')
        )
        return Response({
            'date': date,
            'total_amount': str(summary['total_amount'] or Decimal('0')),
            'payment_count': summary['count'] or 0
        })
    
    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly payment summary | خلاصه ماهانه پرداختها"""
        year = request.query_params.get('year', timezone.now().year)
        month = self.request.query_params.get('month')
        queryset = StudentPayment.active().filter(payment_date__year=year)
        if month:
            queryset = queryset.filter(payment_date__month=month)
        summary = queryset.aggregate(total_amount=Sum('amount'), count=Count('id'))
        return Response({
            'year': year,
            'month': month,
            'total_amount': str(summary['total_amount'] or Decimal('0')),
            'payment_count': summary['count'] or 0
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Mark payment as completed with ledger entry | علامتگذاری به عنوان پرداخت شده"""
        payment = self.get_object()
        with transaction.atomic():
            payment.payment_status = 'completed'
            payment.save()
        return Response({'message': 'Payment marked as completed', 'payment_status': payment.payment_status})
    
    @action(detail=True, methods=['post'])
    def mark_as_refunded(self, request, pk=None):
        """Mark payment as refunded with ledger entry | علامتگذاری به عنوان بازپرداخت شده"""
        payment = self.get_object()
        with transaction.atomic():
            payment.payment_status = 'refunded'
            payment.save()
        return Response({'message': 'Payment marked as refunded', 'payment_status': payment.payment_status})
    
    @action(detail=False, methods=['post'])
    def create_payments_for_assignments(self, request):
        """
        Create payments for selected fee assignments and months.
        
        Workflow:
        1. Select student by level
        2. Get fee assignments for that student
        3. Select specific assignments and months
        4. Create payments for selected combinations
        
        Request body:
        {
            "student": "student_id",
            "class_level": "level_id (optional, 'all' for all levels)",
            "assignment_ids": ["assignment1_id", "assignment2_id", ...],
            "period_year": "2026",
            "period_months": ["01", "02", ...],
            "amount": "1000" (optional, auto-calculated from remaining if not provided),
            "payment_date": "2026-01-15",
            "payment_status": "completed",
            "currency": "AFN"
        }
        """
        import json
        
        student_id = request.data.get('student')
        class_level = request.data.get('class_level')
        assignment_ids = request.data.get('assignment_ids')
        period_year = request.data.get('period_year', str(timezone.now().year))
        period_months = request.data.get('period_months')
        amount = request.data.get('amount')
        payment_date = request.data.get('payment_date', timezone.now().date().isoformat())
        payment_status = request.data.get('payment_status', 'completed')
        currency = request.data.get('currency', 'AFN')
        
        if not student_id:
            return Response({'error': 'student parameter is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        if not assignment_ids or not isinstance(assignment_ids, list) or len(assignment_ids) == 0:
            return Response({'error': 'assignment_ids must be a non-empty list'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        if not period_months or not isinstance(period_months, list) or len(period_months) == 0:
            return Response({'error': 'period_months must be a non-empty list'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=drf_status.HTTP_404_NOT_FOUND)
        
        # Get assignments for this student
        assignments_qs = StudentFeeAssignment.objects.filter(
            student=student,
            id__in=assignment_ids,
            is_active=True
        ).select_related('fee_type')
        
        if class_level and class_level != 'all':
            assignments_qs = assignments_qs.filter(class_level=class_level)
        
        assignments = list(assignments_qs)
        
        if len(assignments) != len(assignment_ids):
            return Response({'error': 'Some assignments not found or not active'}, status=drf_status.HTTP_404_NOT_FOUND)
        
        # Validate months
        norm_months = []
        for m in period_months:
            try:
                mi = int(m)
                if mi < 1 or mi > 12:
                    raise ValueError()
                norm_months.append(str(mi).zfill(2))
            except (ValueError, TypeError):
                continue
        
        if not norm_months:
            return Response({'error': 'No valid period_months provided (1-12 expected)'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Normalize amount to Decimal
        if amount:
            try:
                total_amount = Decimal(str(amount))
            except:
                total_amount = None
        else:
            total_amount = None
        
        # Validate payment_plan constraints
        months_count = len(norm_months)
        for assignment in assignments:
            if assignment.payment_plan and months_count > assignment.payment_plan:
                return Response({
                    'error': f'Assignment for {assignment.fee_type.name} allows at most {assignment.payment_plan} month(s). You selected {months_count}.'
                }, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Validate amounts if provided
        if total_amount:
            # Calculate total remaining across selected assignments
            total_remaining = Decimal('0')
            for assignment in assignments:
                paid = StudentPayment.completed().filter(
                    assignment=assignment,
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                remaining = (assignment.amount or Decimal('0')) - paid
                if remaining < 0:
                    remaining = Decimal('0')
                total_remaining += remaining
            
            if total_amount > total_remaining:
                return Response({
                    'error': f'Payment amount ({total_amount}) exceeds total remaining balance ({total_remaining})'
                }, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Process payments
        created_payments = []
        
        with transaction.atomic():
            if total_amount and len(assignments) > 1:
                # Multiple assignments - split amount proportionally
                weights = [a.amount if a.amount and a.amount > 0 else Decimal('1') for a in assignments]
                weight_sum = sum(weights)
                
                if weight_sum == 0:
                    weights = [Decimal('1') for _ in assignments]
                    weight_sum = Decimal(len(assignments))
                
                # Calculate allocation per assignment
                allocations = []
                accumulated = Decimal('0')
                for idx, a in enumerate(assignments):
                    alloc = (total_amount * (weights[idx] / weight_sum)).quantize(Decimal('0.01'))
                    allocations.append((a, alloc))
                    accumulated += alloc
                
                # Fix rounding remainder
                remainder = total_amount - accumulated
                if remainder != 0 and allocations:
                    a0, v0 = allocations[0]
                    allocations[0] = (a0, (v0 + remainder).quantize(Decimal('0.01')))
                
                # Create payments
                for assignment, alloc_amt in allocations:
                    for month_str in norm_months:
                        # Check remaining for this assignment
                        paid_for_assignment = StudentPayment.completed().filter(
                            assignment=assignment,
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                        remaining_for_assignment = (assignment.amount or Decimal('0')) - paid_for_assignment
                        
                        # Don't overpay
                        pay_amount = min(alloc_amt, remaining_for_assignment)
                        if pay_amount > 0:
                            payment = StudentPayment.objects.create(
                                assignment=assignment,
                                amount=pay_amount,
                                currency=currency,
                                payment_date=payment_date,
                                payment_status=payment_status,
                                period_year=str(period_year),
                                period_month=month_str,
                                fee_type=assignment.fee_type,
                            )
                            created_payments.append(payment)
            else:
                # Single assignment or no amount specified - pay full remaining
                for assignment in assignments:
                    for month_str in norm_months:
                        # Check remaining for this assignment
                        paid_for_assignment = StudentPayment.completed().filter(
                            assignment=assignment,
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
                        remaining_for_assignment = (assignment.amount or Decimal('0')) - paid_for_assignment
                        
                        pay_amount = remaining_for_assignment if not total_amount else min(
                            (total_amount / len(assignments) / len(norm_months)).quantize(Decimal('0.01')),
                            remaining_for_assignment
                        )
                        
                        if pay_amount > 0:
                            payment = StudentPayment.objects.create(
                                assignment=assignment,
                                amount=pay_amount,
                                currency=currency,
                                payment_date=payment_date,
                                payment_status=payment_status,
                                period_year=str(period_year),
                                period_month=month_str,
                                fee_type=assignment.fee_type,
                            )
                            created_payments.append(payment)
        
        # Return success response with created payments
        return Response({
            'success': True,
            'message': f'{len(created_payments)} payments created successfully',
            'payments': StudentPaymentSerializer(created_payments, many=True).data,
            'created_count': len(created_payments)
        }, status=drf_status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def financial_info(self, request):
        """Get comprehensive financial info for a student."""
        student_id = request.query_params.get('student')

        if not student_id:
            return Response({'error': 'student parameter is required'}, status=400)

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)

        class_level = request.query_params.get('class_level')
        return Response(build_student_financial_info(student, class_level=class_level))

    def _parse_student_ids(self, request):
        ids_param = request.query_params.get('students') or request.query_params.get('ids') or ''
        return [int(x) for x in ids_param.split(',') if x.strip().isdigit()]

    def _collect_bulk_financial_data(self, student_ids):
        students = Student.objects.filter(id__in=student_ids).order_by('full_name')
        students_data = []
        fee_type_map = {}

        for student in students:
            info = build_student_financial_info(student)
            for item in info['fee_breakdown']:
                if item['fee_type_id']:
                    fee_type_map[item['fee_type_id']] = item['fee_type']
            students_data.append(info)

        fee_types = [
            {'id': fee_id, 'name': name}
            for fee_id, name in sorted(fee_type_map.items(), key=lambda item: item[1].lower())
        ]
        return students_data, fee_types

    @action(detail=False, methods=['get'])
    def bulk_financial_info(self, request):
        """Financial info for multiple students with unified fee-type columns."""
        student_ids = self._parse_student_ids(request)
        if not student_ids:
            return Response({'error': 'students parameter is required'}, status=400)

        students_data, fee_types = self._collect_bulk_financial_data(student_ids)
        return Response({
            'students': students_data,
            'fee_types': fee_types,
            'count': len(students_data),
        })

    @action(detail=False, methods=['get'])
    def bulk_financial_export(self, request):
        """Export multi-student financial report to Excel."""
        student_ids = self._parse_student_ids(request)
        if not student_ids:
            return Response({'error': 'students parameter is required'}, status=400)

        students_data, fee_types = self._collect_bulk_financial_data(student_ids)
        headers = [
            '#', 'Reg. No.', 'Name', 'Class', 'Address',
            'Transport', 'Phone',
        ]
        headers.extend(ft['name'] for ft in fee_types)
        headers.extend(['Remaining', 'Total'])

        rows = []
        column_totals = {ft['id']: Decimal('0') for ft in fee_types}
        total_remaining = Decimal('0')
        total_fee_sum = Decimal('0')

        for index, student in enumerate(students_data, start=1):
            paid_by_type = {
                item['fee_type_id']: Decimal(item['paid_amount'])
                for item in student['fee_breakdown']
            }
            row = [
                index,
                student['registration_number'],
                student['student_name'],
                student['class_level'] or '-',
                student['current_address'] or '-',
                student['transportation_display'] or '-',
                student['phone'] or '-',
            ]
            for fee_type in fee_types:
                paid = paid_by_type.get(fee_type['id'], Decimal('0'))
                column_totals[fee_type['id']] += paid
                row.append(float(paid))
            remaining = Decimal(student['remaining_amount'])
            total_fee = Decimal(student['total_fee'])
            total_remaining += remaining
            total_fee_sum += total_fee
            row.extend([float(remaining), float(total_fee)])
            rows.append(row)

        footer = ['', '', 'Total', '', '', '', '']
        for fee_type in fee_types:
            footer.append(float(column_totals[fee_type['id']]))
        footer.extend([float(total_remaining), float(total_fee_sum)])
        rows.append(footer)

        return export_to_excel(
            rows,
            headers,
            'student-financial-report.xlsx',
            sheet_name='Students',
            title='Student Financial Report',
            metadata={'Total Students': len(students_data)},
        )
    
    @action(detail=False, methods=['get'])
    def student_fee_assignments(self, request):
        """
        Get fee assignments for a student, optionally filtered by class level.
        This endpoint is used for payment processing to show available fees.
        """
        student_id = request.query_params.get('student')
        class_level = request.query_params.get('class_level')
        
        if not student_id:
            return Response({'error': 'student parameter is required'}, status=400)
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        
        assignments_qs = StudentFeeAssignment.objects.filter(
            student=student,
            is_active=True
        ).select_related('fee_type')
        
        if class_level and class_level != 'all':
            assignments_qs = assignments_qs.filter(class_level=class_level)
        
        serializer = StudentFeeAssignmentSerializer(assignments_qs, many=True, context={'request': request})
        
        return Response({
            'student_id': student.id,
            'student_name': student.full_name,
            'class_level': class_level,
            'student': {
                'id': student.id,
                'full_name': student.full_name,
                'registration_number': student.registration_number,
                'class_level': dict(CLASS_LEVEL_CHOICES).get(student.class_level, student.class_level) if student.class_level else None,
                'total_paid': student.get_total_payments(class_level=student.class_level if class_level == 'all' or not class_level else None),
                'remaining_balance': student.get_remaining_balance(class_level=student.class_level if class_level == 'all' or not class_level else None),
            },
            'total_assignments': serializer.data,
        })

    @action(detail=False, methods=['get'])
    def student_fee_assignments_with_months(self, request):
        """
        Get fee assignments for a student with per-month payment tracking.
        Returns each assignment with paid_months showing which months have been paid.
        """
        student_id = request.query_params.get('student')
        class_level = request.query_params.get('class_level')
        year = request.query_params.get('year', str(timezone.now().year))

        if not student_id:
            return Response(
                {'error': 'student parameter is required'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=drf_status.HTTP_404_NOT_FOUND
            )

        assignments_qs = StudentFeeAssignment.objects.filter(
            student=student,
            is_active=True
        ).select_related('fee_type')

        if class_level and class_level != 'all':
            assignments_qs = assignments_qs.filter(class_level=class_level)

        assignments = list(assignments_qs)
        result = []

        for assignment in assignments:
            assignment_data = StudentFeeAssignmentSerializer(
                assignment, context={'request': request}
            ).data

            # Get paid months for this assignment and year
            paid_payments = StudentPayment.completed().filter(
                assignment=assignment,
                period_year=year,
            ).values('period_month', 'amount', 'id', 'payment_date').order_by('period_month')

            paid_months = []
            paid_total = Decimal('0')
            for p in paid_payments:
                if p['period_month']:
                    paid_months.append({
                        'month': p['period_month'],
                        'amount': str(p['amount']),
                        'payment_id': p['id'],
                        'payment_date': str(p['payment_date']),
                    })
                    paid_total += p['amount'] or Decimal('0')

            # Also include payments without period_month (older payments)
            paid_without_month = StudentPayment.completed().filter(
                assignment=assignment,
            ).exclude(period_month__isnull=False).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')

            total_paid = paid_total + paid_without_month
            remaining = (assignment.amount or Decimal('0')) - total_paid
            if remaining < 0:
                remaining = Decimal('0')

            assignment_data['paid_months'] = paid_months
            assignment_data['paid_month_values'] = [p['month'] for p in paid_months]
            assignment_data['total_paid'] = str(total_paid)
            assignment_data['remaining_amount'] = str(remaining)
            assignment_data['is_fully_paid'] = remaining <= 0

            result.append(assignment_data)

        # Student financial summary (filtered by class_level if provided)
        total_expected = sum(a.amount for a in assignments if a.amount) or Decimal('0')
        payments_qs = StudentPayment.completed().filter(
            assignment__student=student,
        )
        if class_level and class_level != 'all':
            payments_qs = payments_qs.filter(assignment__class_level=class_level)
        total_paid_all = payments_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_remaining = max(total_expected - total_paid_all, Decimal('0'))

        return Response({
            'student_id': student.id,
            'student_name': student.full_name,
            'student_registration': student.registration_number,
            'class_level': class_level,
            'year': year,
            'currency': assignments[0].currency if assignments else 'AFN',
            'total_expected': str(total_expected),
            'total_paid': str(total_paid_all),
            'total_remaining': str(total_remaining),
            'payment_interval_months': assignments[0].payment_plan if assignments else 1,
            'assignments': result,
        })

    @action(detail=False, methods=['get'])
    def fee_assignment_data(self, request):
        """
        Get all data needed for fee assignment in one request.
        Returns: fee types, class level assigned fees, and student's existing assignments.
        """
        class_level = request.query_params.get('class_level')
        student_id = request.query_params.get('student')
        
        if not class_level:
            return Response(
                {'error': 'class_level parameter is required'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )
        
        # Get all active fee types
        fee_types_qs = FeeType.objects.filter(is_active=True).order_by('name')
        fee_types = []
        for ft in fee_types_qs:
            fee_types.append({
                'id': ft.id,
                'name': ft.name,
                'code': ft.code,
                'category': ft.category,
                'is_mandatory': ft.is_mandatory,
            })
        
        # Get all active fee assignments for this class level
        class_assignments_qs = StudentFeeAssignment.objects.filter(
            class_level=class_level,
            is_active=True
        ).select_related('fee_type', 'student')
        
        # Group by fee_type with assignment count and amounts
        from collections import Counter
        fee_type_map = {}
        for a in class_assignments_qs:
            if a.fee_type_id not in fee_type_map:
                fee_type_map[a.fee_type_id] = {
                    'fee_type_id': a.fee_type_id,
                    'assignment_count': 0,
                    'amounts': [],
                }
            fee_type_map[a.fee_type_id]['assignment_count'] += 1
            fee_type_map[a.fee_type_id]['amounts'].append(a.amount)
        
        # Calculate most common amount for each fee type
        class_level_fees = {}
        for ft_id, data in fee_type_map.items():
            amount_counts = Counter(data['amounts'])
            most_common_amount = amount_counts.most_common(1)[0][0] if amount_counts else Decimal('0')
            class_level_fees[ft_id] = {
                'assignment_count': data['assignment_count'],
                'suggested_amount': str(most_common_amount),
            }
        
        # Get student's existing assignments if student_id provided
        student_assignments = []
        if student_id:
            try:
                student = Student.objects.get(id=student_id)
                # Filter by class_level if provided to get level-specific assignments
                student_assignments_qs = StudentFeeAssignment.objects.filter(
                    student=student,
                    is_active=True
                ).select_related('fee_type')
                
                # If class_level is provided, only get assignments for that level
                if class_level:
                    student_assignments_qs = student_assignments_qs.filter(class_level=class_level)
                
                for a in student_assignments_qs:
                    student_assignments.append({
                        'id': a.id,
                        'fee_type_id': a.fee_type_id,
                        'amount': str(a.amount),
                        'currency': a.currency,
                        'payment_plan': a.payment_plan,
                        'class_level': a.class_level,
                        'class_level_name': dict(CLASS_LEVEL_CHOICES).get(a.class_level, a.class_level) if a.class_level else None,
                    })
            except Student.DoesNotExist:
                pass
        
        return Response({
            'fee_types': fee_types,
            'class_level_fees': class_level_fees,
            'student_assignments': student_assignments,
        })

    @action(detail=False, methods=['post'])
    def bulk_assign_fees(self, request):
        """
        Bulk create fee assignments for a student.
        Request body:
        {
            "student": student_id,
            "class_level": class_level,
            "currency": "AFN",
            "payment_plan": 1,
            "assignments": [
                {"fee_type": 1, "amount": "1000"},
                {"fee_type": 2, "amount": "500"},
                ...
            ]
        }
        """
        student_id = request.data.get('student')
        class_level = request.data.get('class_level')
        currency = request.data.get('currency', 'AFN')
        payment_plan = request.data.get('payment_plan', 1)
        assignments_data = request.data.get('assignments', [])

        if not student_id:
            return Response(
                {'error': 'student is required'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if not assignments_data:
            return Response(
                {'error': 'assignments must be a non-empty list'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=drf_status.HTTP_404_NOT_FOUND
            )

        created_assignments = []
        errors = []

        with transaction.atomic():
            for idx, item in enumerate(assignments_data):
                fee_type_id = item.get('fee_type')
                amount = item.get('amount')

                if not fee_type_id or not amount:
                    errors.append(f"Assignment {idx + 1}: fee_type and amount are required")
                    continue

                try:
                    fee_type = FeeType.objects.get(id=fee_type_id, is_active=True)
                except FeeType.DoesNotExist:
                    errors.append(f"Assignment {idx + 1}: Fee type {fee_type_id} not found or inactive")
                    continue

                try:
                    amount_dec = Decimal(str(amount))
                    if amount_dec <= 0:
                        errors.append(f"Assignment {idx + 1}: Amount must be positive")
                        continue
                except Exception:
                    errors.append(f"Assignment {idx + 1}: Invalid amount")
                    continue

                # Check if assignment already exists for this student+fee_type+class_level
                existing = StudentFeeAssignment.objects.filter(
                    student=student,
                    fee_type=fee_type,
                    class_level=class_level if class_level else None,
                    is_active=True
                ).first()

                if existing:
                    # Update existing
                    existing.amount = amount_dec
                    existing.currency = currency
                    existing.payment_plan = payment_plan
                    existing.save()
                    created_assignments.append(existing)
                else:
                    # Create new with class_level
                    assignment = StudentFeeAssignment.objects.create(
                        student=student,
                        fee_type=fee_type,
                        amount=amount_dec,
                        currency=currency,
                        payment_plan=payment_plan,
                        class_level=class_level if class_level else student.class_level,
                        is_active=True,
                        is_mandatory=fee_type.is_mandatory,
                    )
                    created_assignments.append(assignment)

        serializer = StudentFeeAssignmentSerializer(
            created_assignments, many=True, context={'request': request}
        )

        return Response({
            'success': True,
            'message': f'{len(created_assignments)} fee assignment(s) created/updated',
            'created_count': len(created_assignments),
            'errors': errors,
            'assignments': serializer.data,
        }, status=drf_status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def create_payments(self, request):
        """
        Create payments for selected fee assignments and months.
        Request body:
        {
            "student": student_id,
            "payment_date": "2026-01-15",
            "period_year": "2026",
            "currency": "AFN",
            "payment_status": "completed",
            "reference_number": "PAY-2026-001",
            "description": "Monthly payment",
            "payments": [
                {
                    "assignment_id": 1,
                    "amount": "1000",
                    "period_months": ["01", "02", "03"]
                },
                {
                    "assignment_id": 2,
                    "amount": "500",
                    "period_months": ["01"]
                }
            ]
        }
        """
        student_id = request.data.get('student')
        payments_data = request.data.get('payments', [])
        payment_date = request.data.get('payment_date', timezone.now().date().isoformat())
        period_year = request.data.get('period_year', str(timezone.now().year))
        currency = request.data.get('currency', 'AFN')
        payment_status = request.data.get('payment_status', 'completed')
        reference_number = request.data.get('reference_number', '')
        description = request.data.get('description', '')

        if not student_id:
            return Response(
                {'error': 'student is required'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if not payments_data:
            return Response(
                {'error': 'payments must be a non-empty list'},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=drf_status.HTTP_404_NOT_FOUND
            )

        created_payments = []
        errors = []

        with transaction.atomic():
            for idx, pay_item in enumerate(payments_data):
                assignment_id = pay_item.get('assignment_id')
                amount = pay_item.get('amount')
                period_months = pay_item.get('period_months', [])

                if not assignment_id:
                    errors.append(f"Payment {idx + 1}: assignment_id is required")
                    continue

                if not amount or Decimal(str(amount)) <= 0:
                    errors.append(f"Payment {idx + 1}: amount must be positive")
                    continue

                if not period_months:
                    errors.append(f"Payment {idx + 1}: at least one month must be selected")
                    continue

                try:
                    assignment = StudentFeeAssignment.objects.select_related('fee_type').get(
                        id=assignment_id,
                        student=student,
                        is_active=True
                    )
                except StudentFeeAssignment.DoesNotExist:
                    errors.append(f"Payment {idx + 1}: Assignment not found or not active")
                    continue

                # Validate payment_plan constraint
                if assignment.payment_plan and len(period_months) > assignment.payment_plan:
                    errors.append(
                        f"Payment {idx + 1}: {assignment.fee_type.name} allows at most "
                        f"{assignment.payment_plan} month(s). You selected {len(period_months)}."
                    )
                    continue

                # Validate not overpaying
                # The amount entered is the payment amount (NOT divided by months)
                # Months are just for tracking which period this payment covers
                try:
                    payment_amount = Decimal(str(amount))
                except Exception:
                    errors.append(f"Payment {idx + 1}: Invalid amount")
                    continue

                paid_so_far = StudentPayment.completed().filter(
                    assignment=assignment,
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

                remaining = (assignment.amount or Decimal('0')) - paid_so_far
                if payment_amount > remaining:
                    errors.append(
                        f"Payment {idx + 1}: Amount ({payment_amount}) exceeds remaining "
                        f"balance ({remaining}) for {assignment.fee_type.name}"
                    )
                    continue

                # Check for duplicate month payments
                already_paid_months = set(
                    StudentPayment.completed().filter(
                        assignment=assignment,
                        period_year=period_year,
                    ).values_list('period_month', flat=True)
                )

                duplicate_months = set(period_months) & already_paid_months
                if duplicate_months:
                    errors.append(
                        f"Payment {idx + 1}: Months {sorted(duplicate_months)} already paid for "
                        f"{assignment.fee_type.name}"
                    )
                    continue

                # Normalize months
                norm_months = []
                for m in period_months:
                    try:
                        mi = int(m)
                        if 1 <= mi <= 12:
                            norm_months.append(str(mi).zfill(2))
                    except (ValueError, TypeError):
                        continue

                # Create ONE payment record with the full amount
                # The months are just for tracking purposes - amount is NOT divided
                payment = StudentPayment.objects.create(
                    assignment=assignment,
                    amount=payment_amount,
                    currency=currency,
                    payment_date=payment_date,
                    payment_status=payment_status,
                    period_year=str(period_year),
                    period_month=norm_months[0] if norm_months else None,
                    fee_type_id=assignment.fee_type_id,
                    reference_number=reference_number,
                    description=description,
                )
                created_payments.append(payment)

        serializer = StudentPaymentSerializer(
            created_payments, many=True, context={'request': request}
        )

        if errors and not created_payments:
            return Response({
                'success': False,
                'errors': errors,
            }, status=drf_status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': f'{len(created_payments)} payment(s) created successfully',
            'created_count': len(created_payments),
            'errors': errors if errors else None,
            'payments': serializer.data,
        }, status=drf_status.HTTP_201_CREATED)


class FinanceLedgerViewSet(DataRootViewSet):
    """API endpoint for FinanceLedger - Audit trail for all financial transactions
    ویوی لیجر مالی - ردیابی کامل تراکنشهای مالی"""
    permission_module = 'students'
    action_permissions = {
        'by_student': 'view_students',
        'trial_balance': 'view_financial_reports',
        'student_statement': 'view_students',
    }
    queryset = FinanceLedger.objects.all().select_related('student')
    serializer_class = FinanceLedgerSerializer
    filterset_fields = ['student', 'entry_type', 'account', 'entry_side']
    search_fields = ['student__full_name', 'student__registration_number', 'account', 'description']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student')
        entry_type = self.request.query_params.get('entry_type')
        account = self.request.query_params.get('account')
        
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if entry_type:
            queryset = queryset.filter(entry_type=entry_type)
        if account:
            queryset = queryset.filter(account=account)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_student(self, request):
        """Get ledger entries for a specific student | سطرهای لیجر یک شاگرد"""
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'student parameter is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        entries = self.get_queryset().filter(student_id=student_id)
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        """Get trial balance by account | توازن کتابها بر اساس حساب"""
        from django.db.models import Q
        entries = FinanceLedger.objects.all()
        
        balance = {}
        for entry in entries:
            account = entry.account
            if account not in balance:
                balance[account] = {'debit': Decimal('0'), 'credit': Decimal('0')}
            
            if entry.entry_side == 'debit':
                balance[account]['debit'] += entry.amount
            else:
                balance[account]['credit'] += entry.amount
        
        result = []
        for account, amounts in balance.items():
            result.append({
                'account': account,
                'debit': str(amounts['debit']),
                'credit': str(amounts['credit']),
                'balance': str(amounts['debit'] - amounts['credit'])
            })
        
        return Response({'accounts': result, 'total_debit': str(sum(a['debit'] for a in result)), 'total_credit': str(sum(a['credit'] for a in result))})
    
    @action(detail=True, methods=['get'])
    def student_statement(self, request, pk=None):
        """Get student financial statement | صورت وضعیت مالی شاگرد"""
        entry = self.get_object()
        student = entry.student
        if not student:
            return Response({'error': 'No student linked to this ledger entry'}, status=drf_status.HTTP_404_NOT_FOUND)

        entries = FinanceLedger.objects.filter(student=student).order_by('created_at')
        serializer = self.get_serializer(entries, many=True)
        
        # Calculate totals
        totals = entries.aggregate(
            total_debit=Sum('amount', filter=Q(entry_side='debit')),
            total_credit=Sum('amount', filter=Q(entry_side='credit'))
        )
        
        return Response({
            'student': {
                'id': student.id,
                'full_name': student.full_name,
                'registration_number': student.registration_number
            },
            'entries': serializer.data,
            'total_debit': str(totals['total_debit'] or Decimal('0')),
            'total_credit': str(totals['total_credit'] or Decimal('0')),
            'balance': str((totals['total_debit'] or Decimal('0')) - (totals['total_credit'] or Decimal('0')))
        })