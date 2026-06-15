"""
Shop Rental Payment Service
Service layer for handling shop rental payment operations with multi-month support
"""
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from api.models.data.shop_rental import ShopRental
from api.models.data.shop_rental_payment import ShopRentalPayment


class ShopRentalPaymentService:
    """Service class for shop rental payment operations"""
    
    @staticmethod
    def get_monthly_payment_status(rental_id: int, year: str, calendar_type: str = 'shamsi') -> dict:
        """
        Get payment status for each month of a year for a rental
        """
        try:
            rental = ShopRental.objects.select_related('shop', 'tenant').get(id=rental_id)
        except ShopRental.DoesNotExist:
            return {'error': 'Rental not found'}
        
        monthly_rent = rental.monthly_rent
        currency = rental.currency
        
        # Get all completed payments for this rental and year
        payments = ShopRentalPayment.objects.filter(
            rental_id=rental_id,
            period_year=year,
            calendar_type=calendar_type,
            payment_status='completed'
        )
        
        # Calculate per-month payments
        month_status = {}
        for month_num in range(1, 13):
            month_str = str(month_num).zfill(2)
            
            # Get payments that include this month
            month_payments = [p for p in payments if month_str in (p.period_months or [])]
            
            # Distribute payment amount across months
            total_paid = Decimal('0')
            for p in month_payments:
                months_count = len(p.period_months) if p.period_months else 1
                total_paid += p.amount / months_count
            
            payment_count = len(month_payments)
            remaining = max(Decimal('0'), monthly_rent - total_paid)
            is_paid = total_paid >= monthly_rent * Decimal('0.99')  # 99% threshold
            payment_percentage = float((total_paid / monthly_rent * 100) if monthly_rent > 0 else 0)
            
            month_status[month_str] = {
                'month': month_str,
                'rent': float(monthly_rent),
                'paid': float(total_paid),
                'remaining': float(remaining),
                'is_paid': is_paid,
                'payment_count': payment_count,
                'payment_percentage': payment_percentage,
                'currency': currency,
                'payment_ids': [p.id for p in month_payments],
            }
        
        return {
            'rental_id': rental_id,
            'year': year,
            'calendar_type': calendar_type,
            'shop': {
                'id': rental.shop.id,
                'shop_number': rental.shop.shop_number,
                'name': rental.shop.name,
            },
            'tenant': {
                'id': rental.tenant.id,
                'full_name': rental.tenant.full_name,
            },
            'monthly_rent': float(monthly_rent),
            'currency': currency,
            'months': month_status,
            'summary': {
                'total_rent': float(monthly_rent * 12),
                'total_paid': float(sum(Decimal(str(m['paid'])) for m in month_status.values())),
                'total_remaining': float(sum(Decimal(str(m['remaining'])) for m in month_status.values())),
                'months_paid_count': sum(1 for m in month_status.values() if m['is_paid']),
                'months_pending_count': sum(1 for m in month_status.values() if not m['is_paid']),
            }
        }
    
    @staticmethod
    @transaction.atomic
    def create_multi_month_payment(
        rental_id: int,
        amount: Decimal,
        period_months: list,
        period_year: str,
        calendar_type: str = 'shamsi',
        payment_date=None,
        payment_status: str = 'completed',
        description: str = '',
        **kwargs
    ) -> ShopRentalPayment:
        """
        Create a payment for multiple months
        """
        rental = ShopRental.objects.get(id=rental_id)
        
        # Normalize months to zero-padded strings
        normalized_months = []
        for m in period_months:
            try:
                month_int = int(m)
                if 1 <= month_int <= 12:
                    normalized_months.append(str(month_int).zfill(2))
            except (ValueError, TypeError):
                continue
        
        if not normalized_months:
            raise ValueError('At least one valid month (1-12) is required')
        
        payment = ShopRentalPayment.objects.create(
            rental=rental,
            amount=amount,
            currency=rental.currency,
            payment_date=payment_date or timezone.now().date(),
            payment_status=payment_status,
            period_months=normalized_months,
            period_year=str(period_year),
            calendar_type=calendar_type,
            description=description,
            **kwargs
        )
        
        return payment
