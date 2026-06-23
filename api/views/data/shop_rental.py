from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from api.models.data.shop_rental import Shop, Tenant, ShopRental
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.serializers.data.shop_rental import ShopSerializer, TenantSerializer, ShopRentalSerializer
from api.serializers.data.shop_rental_payment import ShopRentalPaymentSerializer
from api.views.data.base import DataRootViewSet
from decimal import Decimal


class ShopViewSet(DataRootViewSet):
    permission_module = 'shop_rentals'
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
        
        return queryset
    
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
