from decimal import Decimal

from jdatetime import datetime as jdatetime_datetime

from api.models.data.shop_rental_payment import ShopRentalPayment


def get_shamsi_year(year_param=None):
    if year_param:
        return str(year_param)
    return str(jdatetime_datetime.now().year)


def build_rental_payment_summary(rental, year=None):
    """Payment summary for one rental (same logic as ShopRentalSerializer)."""
    current_year = get_shamsi_year(year)

    payments = ShopRentalPayment.objects.filter(
        rental=rental,
        payment_status='completed',
        calendar_type='shamsi',
        period_year=current_year,
    )

    months_status = {}
    for i in range(1, 13):
        month_str = str(i).zfill(2)
        months_status[month_str] = {
            'month': month_str,
            'rent': float(rental.monthly_rent),
            'paid': Decimal('0'),
            'remaining': float(rental.monthly_rent),
            'is_paid': False,
            'payment_percentage': 0,
            'payment_count': 0,
        }

    for payment in payments:
        if payment.period_months:
            months_count = len(payment.period_months)
            if months_count > 0:
                amount_per_month = payment.amount / months_count
                for month in payment.period_months:
                    month_str = str(month).zfill(2) if len(str(month)) < 2 else str(month)
                    if month_str in months_status:
                        months_status[month_str]['paid'] += amount_per_month
                        months_status[month_str]['payment_count'] += 1

    total_paid_year = Decimal('0')
    for month_str in months_status:
        paid = months_status[month_str]['paid']
        total_paid_year += paid
        remaining = max(Decimal('0'), rental.monthly_rent - paid)
        is_paid = paid >= rental.monthly_rent * Decimal('0.99')
        payment_percentage = float((paid / rental.monthly_rent * 100) if rental.monthly_rent > 0 else 0)

        months_status[month_str]['paid'] = float(paid)
        months_status[month_str]['remaining'] = float(remaining)
        months_status[month_str]['is_paid'] = is_paid
        months_status[month_str]['payment_percentage'] = payment_percentage

    months_paid = [m for m, status in months_status.items() if status['is_paid']]
    months_pending = [m for m, status in months_status.items() if not status['is_paid']]
    total_expected_year = rental.monthly_rent * 12
    total_remaining_year = max(Decimal('0'), total_expected_year - total_paid_year)

    return {
        'total_paid_year': float(total_paid_year),
        'total_remaining_year': float(total_remaining_year),
        'total_expected_year': float(total_expected_year),
        'months_paid_count': len(months_paid),
        'months_pending_count': len(months_pending),
        'months_status': months_status,
        'currency': rental.currency,
        'year': int(current_year),
    }


def build_payment_report_row(payment):
    rental = payment.rental
    shop = rental.shop if rental else None
    tenant = rental.tenant if rental else None
    period_months = payment.period_months or []
    return {
        'payment_id': payment.id,
        'reference_number': payment.reference_number,
        'shop_number': shop.shop_number if shop else '',
        'shop_name': shop.name if shop else '',
        'tenant_name': tenant.full_name if tenant else '',
        'amount': float(payment.amount),
        'currency': payment.currency,
        'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
        'payment_status': payment.payment_status,
        'period_year': payment.period_year,
        'period_months': period_months,
        'period_months_count': len(period_months),
        'description': payment.description or '',
    }


def build_rental_report_row(rental, year=None):
    summary = build_rental_payment_summary(rental, year=year)
    shop = rental.shop
    tenant = rental.tenant
    return {
        'rental_id': rental.id,
        'shop_number': shop.shop_number if shop else '',
        'shop_name': shop.name if shop else '',
        'shop_location': shop.location if shop else '',
        'tenant_name': tenant.full_name if tenant else '',
        'tenant_phone': tenant.phone if tenant else '',
        'tenant_email': tenant.email if tenant else '',
        'start_date': rental.start_date.isoformat() if rental.start_date else None,
        'end_date': rental.end_date.isoformat() if rental.end_date else None,
        'monthly_rent': float(rental.monthly_rent),
        'currency': rental.currency,
        'rental_status': rental.rental_status,
        'payment_summary': summary,
    }
