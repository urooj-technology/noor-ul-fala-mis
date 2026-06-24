from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone
from django.db import transaction
from rest_framework import status as drf_status
import json
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.models.data.shop_rental import ShopRental
from api.serializers.data.shop_rental_payment import ShopRentalPaymentSerializer
from api.views.data.base import DataRootViewSet
from api.services.shop_rental_payment_service import ShopRentalPaymentService
from api.utils.registration_dates import get_registration_date_range
from decimal import Decimal


class ShopRentalPaymentViewSet(DataRootViewSet):
    permission_module = 'shop_rentals'
    action_permissions = {
        'daily_summary': 'view_shop_rentals',
        'monthly_summary': 'view_shop_rentals',
        'by_rental': 'view_shop_rentals',
        'rental_financial_info': 'view_shop_rentals',
        'rental_monthly_status': 'view_shop_rentals',
        'tenant_financial_summary': 'view_shop_rentals',
    }
    queryset = ShopRentalPayment.objects.select_related(
        'rental__shop',
        'rental__tenant',
        'transaction'
    ).all().order_by('-payment_date')
    serializer_class = ShopRentalPaymentSerializer
    filterset_fields = ['rental', 'payment_status', 'payment_date']
    search_fields = ['reference_number', 'description']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by rental
        rental = self.request.query_params.get('rental')
        if rental:
            queryset = queryset.filter(rental_id=rental)

        # Filter by status
        status = self.request.query_params.get('payment_status')
        if status:
            queryset = queryset.filter(payment_status=status)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)

        date_period = self.request.query_params.get('date_period')
        if date_period:
            period_from = self.request.query_params.get('date_from')
            period_to = self.request.query_params.get('date_to')
            range_start, range_end = get_registration_date_range(
                date_period, period_from, period_to
            )
            if range_start and range_end:
                queryset = queryset.filter(
                    payment_date__gte=range_start,
                    payment_date__lte=range_end,
                )
            elif date_period == 'custom':
                queryset = queryset.none()
        
        # Filter by calendar type
        calendar_type = self.request.query_params.get('calendar_type')
        if calendar_type:
            queryset = queryset.filter(calendar_type=calendar_type)
        
        # Filter by year
        period_year = self.request.query_params.get('period_year')
        if period_year:
            queryset = queryset.filter(period_year=period_year)

        return queryset

    def list(self, request, *args, **kwargs):
        """Return all matching payments without pagination when filtering by date period."""
        if request.query_params.get('date_period'):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'count': queryset.count(),
                'results': serializer.data,
            })
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        """Create payment with multi-month support"""
        rental_id = request.data.get('rental')
        amount = request.data.get('amount')
        period_months = request.data.get('period_months', [])
        period_year = request.data.get('period_year', str(timezone.now().year))
        calendar_type = request.data.get('calendar_type', 'shamsi')
        payment_date = request.data.get('payment_date', timezone.now().date().isoformat())
        payment_status = request.data.get('payment_status', 'completed')
        description = request.data.get('description', '')
        
        # Validate rental
        if not rental_id:
            return Response({'error': 'rental is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        try:
            rental = ShopRental.objects.get(id=rental_id)
        except ShopRental.DoesNotExist:
            return Response({'error': 'Rental not found'}, status=drf_status.HTTP_404_NOT_FOUND)
        
        # Validate amount
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'error': 'amount must be positive'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Parse period_months if string
        if isinstance(period_months, str):
            try:
                period_months = json.loads(period_months)
            except:
                period_months = [period_months]
        
        # Normalize months
        normalized_months = []
        for m in period_months:
            try:
                mi = int(m)
                if 1 <= mi <= 12:
                    normalized_months.append(str(mi).zfill(2))
            except:
                pass
        
        if not normalized_months:
            return Response({'error': 'At least one valid month (1-12) is required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        
        # Create payment
        with transaction.atomic():
            payment = ShopRentalPayment.objects.create(
                rental=rental,
                amount=Decimal(str(amount)),
                currency=rental.currency,
                payment_date=payment_date,
                payment_status=payment_status,
                period_months=normalized_months,
                period_year=str(period_year),
                calendar_type=calendar_type,
                description=description,
            )
        
        serializer = self.get_serializer(payment)
        return Response(serializer.data, status=drf_status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get daily rental payment summary"""
        date = request.query_params.get('date', timezone.now().date().isoformat())

        summary = ShopRentalPayment.objects.filter(
            payment_date=date
        ).aggregate(
            total_amount=Sum('amount'),
            count=Count('id')
        )

        return Response({
            'date': date,
            'total_amount': float(summary['total_amount'] or 0),
            'payment_count': summary['count'] or 0
        })

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly rental payment summary"""
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month')

        queryset = ShopRentalPayment.objects.filter(payment_date__year=year)

        if month:
            queryset = queryset.filter(payment_date__month=month)

        summary = queryset.aggregate(
            total_amount=Sum('amount'),
            count=Count('id')
        )

        return Response({
            'year': year,
            'month': month,
            'total_amount': float(summary['total_amount'] or 0),
            'payment_count': summary['count'] or 0
        })

    @action(detail=False, methods=['get'])
    def by_rental(self, request):
        """Get rental payments grouped by rental"""
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month')

        queryset = ShopRentalPayment.objects.filter(payment_date__year=year)

        if month:
            queryset = queryset.filter(payment_date__month=month)

        payments_by_rental = queryset.values(
            'rental__shop__shop_number',
            'rental__shop__name',
            'rental__tenant__full_name'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        )

        return Response({
            'year': year,
            'month': month,
            'payments_by_rental': list(payments_by_rental)
        })

    @action(detail=False, methods=['get'])
    def rental_financial_info(self, request):
        """Get financial info for a specific rental (monthly rent, payments, remaining)"""
        rental_id = request.query_params.get('rental_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year', str(timezone.now().year))
        calendar_type = request.query_params.get('calendar_type', 'shamsi')

        if not rental_id:
            return Response({'error': 'rental_id is required'}, status=400)

        try:
            rental = ShopRental.objects.select_related('shop', 'tenant').get(id=rental_id)
        except ShopRental.DoesNotExist:
            return Response({'error': 'Rental not found'}, status=404)

        monthly_rent = rental.monthly_rent
        
        # Get all completed payments for this rental and year
        all_payments = ShopRentalPayment.objects.filter(
            rental_id=rental_id,
            payment_status='completed'
        )
        
        year_payments = all_payments.filter(
            period_year=str(year),
            calendar_type=calendar_type
        )
        
        # Calculate per-month status
        # Each payment amount is distributed evenly across all months in period_months
        month_status = {}
        for m_num in range(1, 13):
            m_str = str(m_num).zfill(2)
            # Get payments that include this month
            payments_for_month = [p for p in year_payments if m_str in (p.period_months or [])]
            # Distribute payment amount across months
            total_paid = Decimal('0')
            for p in payments_for_month:
                months_count = len(p.period_months) if p.period_months else 1
                total_paid += p.amount / months_count
            
            remaining = max(Decimal('0'), monthly_rent - total_paid)
            is_paid = total_paid >= monthly_rent * Decimal('0.99')  # 99% threshold
            
            month_status[m_str] = {
                'month': m_str,
                'rent': float(monthly_rent),
                'paid': float(total_paid),
                'remaining': float(remaining),
                'is_paid': is_paid,
                'payment_percentage': float((total_paid / monthly_rent * 100) if monthly_rent > 0 else 0),
                'payment_count': len(payments_for_month),
            }
        
        # If specific month requested, return detailed info for that month
        if month:
            month_str = str(month).zfill(2) if len(str(month)) < 2 else str(month)
            # Get payments for specific month
            month_payments = [p for p in year_payments if month_str in (p.period_months or [])]
            monthly_payments_total = Decimal('0')
            for p in month_payments:
                months_count = len(p.period_months) if p.period_months else 1
                monthly_payments_total += p.amount / months_count
            remaining = max(Decimal('0'), monthly_rent - monthly_payments_total)
            
            return Response({
                'rental_id': rental.id,
                'shop': {
                    'id': rental.shop.id,
                    'shop_number': rental.shop.shop_number,
                    'name': rental.shop.name,
                },
                'tenant': {
                    'id': rental.tenant.id,
                    'full_name': rental.tenant.full_name,
                },
                'currency': rental.currency,
                'monthly_rent': float(monthly_rent),
                'period': {
                    'month': month_str,
                    'year': int(year)
                },
                'current_month': {
                    'total_paid': float(monthly_payments_total),
                    'remaining': float(remaining),
                    'is_paid': monthly_payments_total >= monthly_rent * Decimal('0.99'),
                    'payment_percentage': float((monthly_payments_total / monthly_rent * 100) if monthly_rent > 0 else 0)
                },
                'total_paid_all_time': float(all_payments.aggregate(t=Sum('amount'))['t'] or 0),
                'rental_period': {
                    'start_date': rental.start_date.isoformat(),
                    'end_date': rental.end_date.isoformat(),
                    'is_active': rental.is_active,
                    'is_expired': rental.is_expired
                },
            })
        
        # Return full year summary
        total_paid_year = Decimal(str(sum(m['paid'] for m in month_status.values())))
        total_remaining_year = Decimal(str(sum(m['remaining'] for m in month_status.values())))
        
        return Response({
            'rental_id': rental.id,
            'shop': {
                'id': rental.shop.id,
                'shop_number': rental.shop.shop_number,
                'name': rental.shop.name,
            },
            'tenant': {
                'id': rental.tenant.id,
                'full_name': rental.tenant.full_name,
            },
            'currency': rental.currency,
            'monthly_rent': float(monthly_rent),
            'year': int(year),
            'calendar_type': calendar_type,
            'months': month_status,
            'summary': {
                'total_rent_year': float(monthly_rent * 12),
                'total_paid_year': float(total_paid_year),
                'total_remaining_year': float(total_remaining_year),
                'months_paid_count': sum(1 for m in month_status.values() if m['is_paid']),
                'months_pending_count': sum(1 for m in month_status.values() if not m['is_paid']),
            },
            'total_paid_all_time': float(all_payments.aggregate(t=Sum('amount'))['t'] or 0),
            'rental_period': {
                'start_date': rental.start_date.isoformat(),
                'end_date': rental.end_date.isoformat(),
                'is_active': rental.is_active,
                'is_expired': rental.is_expired
            },
        })
    
    @action(detail=False, methods=['get'])
    def rental_monthly_status(self, request):
        """Get monthly payment status for a rental (shows each month: paid, remaining, rent)"""
        rental_id = request.query_params.get('rental_id')
        year = request.query_params.get('year', str(timezone.now().year))
        calendar_type = request.query_params.get('calendar_type', 'shamsi')
        
        if not rental_id:
            return Response({'error': 'rental_id is required'}, status=400)
        
        result = ShopRentalPaymentService.get_monthly_payment_status(
            rental_id=rental_id,
            year=year,
            calendar_type=calendar_type
        )
        
        if 'error' in result:
            return Response(result, status=404)
        
        return Response(result)

    @action(detail=False, methods=['get'])
    def tenant_financial_summary(self, request):
        """Get financial summary for all rentals of a tenant"""
        tenant_id = request.query_params.get('tenant_id')
        year = request.query_params.get('year', timezone.now().year)

        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=400)

        rentals = ShopRental.objects.filter(
            tenant_id=tenant_id,
            rental_status='active'
        ).select_related('shop', 'tenant')

        summary = []
        for rental in rentals:
            monthly_payments = ShopRentalPayment.objects.filter(
                rental_id=rental.id,
                period_year=str(year),
                payment_status='completed'
            ).values('period_month').annotate(total=Sum('amount'))

            total_paid_year = sum(p['total'] for p in monthly_payments)

            summary.append({
                'rental_id': rental.id,
                'shop': {
                    'shop_number': rental.shop.shop_number,
                    'name': rental.shop.name,
                },
                'currency': rental.currency,
                'monthly_rent': float(rental.monthly_rent),
                'year': int(year),
                'total_paid_year': float(total_paid_year),
                'payments_by_month': [
                    {
                        'month': p['period_month'],
                        'amount': float(p['total'])
                    } for p in monthly_payments
                ]
            })

        return Response({
            'tenant_id': tenant_id,
            'rentals_summary': summary
        })
