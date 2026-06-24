from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.http import HttpResponse
from api.models.data.shop_rental import Shop, Tenant, ShopRental
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.serializers.data.shop_rental import ShopSerializer, TenantSerializer, ShopRentalSerializer
from api.serializers.data.shop_rental_payment import ShopRentalPaymentSerializer
from api.views.data.base import DataRootViewSet
from api.utils.registration_dates import get_registration_date_range
from api.services.shop_rental_report import build_rental_report_row, build_payment_report_row, get_shamsi_year
from decimal import Decimal
import openpyxl


class ShopViewSet(DataRootViewSet):
    permission_module = 'shop_rentals'
    action_permissions = {
        'statistics': 'view_shop_rentals',
    }
    queryset = Shop.objects.all().order_by('shop_number')
    serializer_class = ShopSerializer
    filterset_fields = ['status']
    search_fields = ['shop_number', 'name', 'location']
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get shop statistics"""
        total_shops = Shop.objects.count()
        available_shops = Shop.objects.filter(status='available').count()
        rented_shops = Shop.objects.filter(status='rented').count()
        
        # Total monthly rent
        total_monthly_rent = Shop.objects.aggregate(
            total=Sum('monthly_rent')
        )['total'] or Decimal('0.00')
        
        return Response({
            'total_shops': total_shops,
            'available_shops': available_shops,
            'rented_shops': rented_shops,
            'total_monthly_rent': float(total_monthly_rent)
        })


class TenantViewSet(DataRootViewSet):
    permission_module = 'shop_rentals'
    queryset = Tenant.objects.all().order_by('full_name')
    serializer_class = TenantSerializer
    search_fields = ['full_name', 'phone', 'email', 'tazkira_number']


class ShopRentalViewSet(DataRootViewSet):
    permission_module = 'shop_rentals'
    action_permissions = {
        'bulk_rental_info': 'view_shop_rentals',
        'bulk_rental_export': 'export_reports',
        'period_report': 'view_shop_rentals',
        'active_rentals': 'view_shop_rentals',
        'expiring_rentals': 'view_shop_rentals',
        'monthly_income': 'view_shop_rentals',
        'payments': 'view_shop_rentals',
        'add_payment': 'create_shop_rentals',
        'financial_info': 'view_shop_rentals',
    }
    queryset = ShopRental.objects.all().order_by('-start_date')
    serializer_class = ShopRentalSerializer
    filterset_fields = ['shop', 'tenant', 'rental_status']
    search_fields = [
        'shop__shop_number', 'shop__name', 
        'tenant__full_name', 'tenant__phone'
    ]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by shop
        shop = self.request.query_params.get('shop')
        if shop:
            queryset = queryset.filter(shop_id=shop)
        
        # Filter by tenant
        tenant = self.request.query_params.get('tenant')
        if tenant:
            queryset = queryset.filter(tenant_id=tenant)
        
        # Filter by status
        status = self.request.query_params.get('rental_status')
        if status:
            queryset = queryset.filter(rental_status=status)

        start_date_period = self.request.query_params.get('start_date_period')
        if start_date_period:
            date_from = self.request.query_params.get('start_date_from')
            date_to = self.request.query_params.get('start_date_to')
            range_start, range_end = get_registration_date_range(
                start_date_period, date_from, date_to
            )
            if range_start and range_end:
                queryset = queryset.filter(
                    start_date__gte=range_start,
                    start_date__lte=range_end,
                )
            elif start_date_period == 'custom':
                queryset = queryset.none()

        # Report: only rentals that received a payment in the chosen period
        if self.request.query_params.get('for_report'):
            date_period = self.request.query_params.get('date_period')
            if date_period:
                date_from = self.request.query_params.get('date_from')
                date_to = self.request.query_params.get('date_to')
                range_start, range_end = get_registration_date_range(
                    date_period, date_from, date_to
                )
                if range_start and range_end:
                    rental_ids = ShopRentalPayment.objects.filter(
                        is_deleted=False,
                        payment_date__gte=range_start,
                        payment_date__lte=range_end,
                    ).values_list('rental_id', flat=True).distinct()
                    queryset = queryset.filter(id__in=rental_ids)
                elif date_period == 'custom':
                    queryset = queryset.none()

        return queryset

    def list(self, request, *args, **kwargs):
        """Return all matching rentals without pagination for report or start-date period filters."""
        if request.query_params.get('start_date_period') or request.query_params.get('for_report'):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'count': queryset.count(),
                'results': serializer.data,
            })
        return super().list(request, *args, **kwargs)

    def _parse_rental_ids(self, request):
        raw = request.query_params.get('rentals') or request.query_params.get('ids') or ''
        return [int(i) for i in raw.split(',') if i.strip().isdigit()]

    def _collect_bulk_rental_data(self, rental_ids, year=None):
        rentals = ShopRental.objects.filter(
            id__in=rental_ids,
            is_deleted=False,
        ).select_related('shop', 'tenant').order_by('shop__shop_number')
        return [build_rental_report_row(rental, year=year) for rental in rentals]

    @action(detail=False, methods=['get'])
    def bulk_rental_info(self, request):
        """Rental report data for multiple rentals (bulk print)."""
        rental_ids = self._parse_rental_ids(request)
        if not rental_ids:
            return Response({'error': 'rentals parameter is required'}, status=400)

        year = request.query_params.get('year')
        rentals_data = self._collect_bulk_rental_data(rental_ids, year=year)
        return Response({
            'rentals': rentals_data,
            'year': int(year) if year and year.isdigit() else rentals_data[0]['payment_summary']['year'] if rentals_data else None,
            'count': len(rentals_data),
        })

    @action(detail=False, methods=['get'])
    def bulk_rental_export(self, request):
        """Export multi-rental report to Excel."""
        rental_ids = self._parse_rental_ids(request)
        if not rental_ids:
            return Response({'error': 'rentals parameter is required'}, status=400)

        year = request.query_params.get('year')
        rentals_data = self._collect_bulk_rental_data(rental_ids, year=year)
        month_headers = [str(i).zfill(2) for i in range(1, 13)]
        headers = [
            '#', 'Shop No.', 'Shop Name', 'Tenant', 'Phone',
            'Start Date', 'End Date', 'Monthly Rent', 'Status',
            *month_headers,
            'Paid (Year)', 'Remaining (Year)', 'Months Paid',
        ]

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = 'Shop Rentals'
        ws.append(headers)

        for index, rental in enumerate(rentals_data, start=1):
            summary = rental['payment_summary']
            months = summary.get('months_status', {})
            row = [
                index,
                rental['shop_number'],
                rental['shop_name'],
                rental['tenant_name'],
                rental['tenant_phone'],
                rental['start_date'],
                rental['end_date'],
                rental['monthly_rent'],
                rental['rental_status'],
            ]
            for month in month_headers:
                row.append(months.get(month, {}).get('paid', 0))
            row.extend([
                summary.get('total_paid_year', 0),
                summary.get('total_remaining_year', 0),
                summary.get('months_paid_count', 0),
            ])
            ws.append(row)

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename=shop-rental-report.xlsx'
        wb.save(response)
        return response

    @action(detail=False, methods=['get'])
    def period_report(self, request):
        """Combined rental + payment report for a date period."""
        date_period = request.query_params.get('date_period')
        if not date_period:
            return Response({'error': 'date_period is required'}, status=400)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        range_start, range_end = get_registration_date_range(date_period, date_from, date_to)
        if not range_start or not range_end:
            return Response({'error': 'Invalid or incomplete date period'}, status=400)

        year = request.query_params.get('year')
        payment_status = request.query_params.get('payment_status')

        rentals_qs = self.get_queryset().filter(
            start_date__lte=range_end,
            end_date__gte=range_start,
        ).select_related('shop', 'tenant').order_by('shop__shop_number')

        rentals_data = [build_rental_report_row(rental, year=year) for rental in rentals_qs]

        payments_qs = ShopRentalPayment.objects.filter(
            is_deleted=False,
            payment_date__gte=range_start,
            payment_date__lte=range_end,
        ).select_related('rental__shop', 'rental__tenant').order_by('-payment_date')

        if payment_status:
            payments_qs = payments_qs.filter(payment_status=payment_status)

        payments_data = [build_payment_report_row(payment) for payment in payments_qs]

        report_year = int(year) if year and str(year).isdigit() else int(get_shamsi_year())
        total_payment_amount = sum(p['amount'] for p in payments_data)

        return Response({
            'period': {
                'from': range_start.isoformat(),
                'to': range_end.isoformat(),
            },
            'year': report_year,
            'rentals': rentals_data,
            'payments': payments_data,
            'summary': {
                'rental_count': len(rentals_data),
                'payment_count': len(payments_data),
                'total_payment_amount': total_payment_amount,
            },
        })
    
    @action(detail=False, methods=['get'])
    def active_rentals(self, request):
        """Get active rentals"""
        today = timezone.now().date()
        
        active_rentals = ShopRental.objects.filter(
            rental_status='active',
            start_date__lte=today,
            end_date__gte=today
        )
        
        serializer = self.get_serializer(active_rentals, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expiring_rentals(self, request):
        """Get rentals expiring soon (within 30 days)"""
        today = timezone.now().date()
        thirty_days_later = today.replace(day=today.day + 30)
        
        expiring_rentals = ShopRental.objects.filter(
            rental_status='active',
            end_date__gte=today,
            end_date__lte=thirty_days_later
        )
        
        serializer = self.get_serializer(expiring_rentals, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def monthly_income(self, request):
        """Get monthly rental income"""
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month')
        
        queryset = ShopRental.objects.filter(
            start_date__year=year,
            rental_status='active'
        )
        
        if month:
            queryset = queryset.filter(start_date__month=month)
        
        total_income = queryset.aggregate(
            total=Sum('monthly_rent')
        )['total'] or Decimal('0.00')
        
        return Response({
            'year': year,
            'month': month,
            'total_monthly_income': float(total_income),
            'active_rentals_count': queryset.count()
        })
    
    @action(detail=True, methods=['get'])
    def payments(self, request, pk=None):
        """Get payments for a specific rental"""
        rental = self.get_object()
        payments = ShopRentalPayment.objects.filter(rental=rental).order_by('-payment_date')
        serializer = ShopRentalPaymentSerializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add a payment for a rental - journal entry created automatically by signal"""
        rental = self.get_object()
        
        serializer = ShopRentalPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save(rental=rental)
        
        return Response(serializer.data, status=201)
    
    @action(detail=True, methods=['get'])
    def financial_info(self, request, pk=None):
        """Get financial info for a specific rental based on month/year"""
        rental = self.get_object()
        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)
        
        # Ensure month is zero-padded for consistent querying
        month_str = str(month).zfill(2)
        year_str = str(year)
        
        # Get payments for the specified month - check both padded and non-padded formats
        monthly_payments = ShopRentalPayment.objects.filter(
            rental=rental,
            period_year=year_str,
            payment_status='completed'
        ).filter(
            Q(period_month=month_str) | Q(period_month=str(month))
        ).aggregate(total_paid=Sum('amount'))['total_paid'] or Decimal('0')
        
        monthly_rent = rental.monthly_rent
        remaining = monthly_rent - monthly_payments
        
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
                'month': int(month),
                'year': int(year)
            },
            'current_month': {
                'total_paid': float(monthly_payments),
                'remaining': float(remaining),
                'is_paid': monthly_payments >= monthly_rent,
                'payment_percentage': float((monthly_payments / monthly_rent * 100) if monthly_rent > 0 else 0)
            },
            'rental_period': {
                'start_date': rental.start_date.isoformat(),
                'end_date': rental.end_date.isoformat(),
                'is_active': rental.is_active,
                'is_expired': rental.is_expired
            }
        })
