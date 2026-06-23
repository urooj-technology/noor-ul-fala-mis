from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db import transaction
from django.utils import timezone
from api.models.data.student import Student, CLASS_LEVEL_CHOICES
from api.serializers.data.student import StudentSerializer
from api.views.data.base import DataRootViewSet
from decimal import Decimal
from rest_framework import status as drf_status


class StudentViewSet(DataRootViewSet):
    permission_module = 'students'
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

        return queryset

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