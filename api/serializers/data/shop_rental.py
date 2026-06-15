from rest_framework import serializers
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
from api.models.data.shop_rental import Shop, Tenant, ShopRental
from api.models.data.shop_rental_payment import ShopRentalPayment
from api.serializers.data.base import DataRootSerializer
from api.utils.calendar import get_calendar_info


class ShopSerializer(DataRootSerializer):
    class Meta:
        model = Shop
        fields = [
            'id', 'shop_number', 'name', 'location', 'area', 'monthly_rent', 
            'currency', 'status', 'description', 'created_at', 'updated_at'
        ]


class TenantSerializer(DataRootSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'full_name', 'phone', 'email', 'address', 'tazkira_number', 'description', 'created_at', 'updated_at']


class ShopRentalSerializer(DataRootSerializer):
    shop_details = serializers.SerializerMethodField()
    tenant_details = serializers.SerializerMethodField()
    currency_details = serializers.SerializerMethodField()
    # Payment tracking fields
    payment_summary = serializers.SerializerMethodField()
    # Calendar date fields
    start_date_shamsi = serializers.SerializerMethodField(read_only=True)
    start_date_qamari = serializers.SerializerMethodField(read_only=True)
    end_date_shamsi = serializers.SerializerMethodField(read_only=True)
    end_date_qamari = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ShopRental
        fields = [
            'id', 'shop', 'tenant', 'start_date', 'start_date_shamsi', 'start_date_qamari', 
            'end_date', 'end_date_shamsi', 'end_date_qamari', 'monthly_rent', 
            'currency', 'rental_status', 'security_deposit', 'description',
            'shop_details', 'tenant_details', 'currency_details', 'is_active', 'is_expired',
            'payment_summary',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'is_active', 'is_expired', 'currency_details', 'payment_summary',
            'start_date_shamsi', 'start_date_qamari', 'end_date_shamsi', 'end_date_qamari'
        ]
    
    def get_shop_details(self, obj):
        if obj.shop:
            return {
                'id': obj.shop.id,
                'shop_number': obj.shop.shop_number,
                'name': obj.shop.name,
                'location': obj.shop.location,
                'monthly_rent': float(obj.shop.monthly_rent)
            }
        return None
    
    def get_tenant_details(self, obj):
        if obj.tenant:
            return {
                'id': obj.tenant.id,
                'full_name': obj.tenant.full_name,
                'phone': obj.tenant.phone,
                'email': obj.tenant.email
            }
        return None
    
    def get_currency_details(self, obj):
        from api.models.data.choices import CURRENCY_CHOICES
        if obj.currency:
            currency_name = dict(CURRENCY_CHOICES).get(obj.currency, obj.currency)
            return {
                'code': obj.currency,
                'name': currency_name
            }
        return None
    
    def get_payment_summary(self, obj):
        """
        Get payment summary for this rental.
        Returns total paid, remaining, and months status.
        Supports year filtering from request context.
        """
        from jdatetime import datetime as jdatetime_datetime
        
        # Try to get year from context (request params)
        request = self.context.get('request')
        if request and hasattr(request, 'query_params'):
            year_param = request.query_params.get('year')
            if year_param:
                current_year = str(year_param)
            else:
                now_j = jdatetime_datetime.now()
                current_year = str(now_j.year)
        else:
            now_j = jdatetime_datetime.now()
            current_year = str(now_j.year)
        
        # Get all completed payments for this rental for the specified year
        payments = ShopRentalPayment.objects.filter(
            rental=obj,
            payment_status='completed',
            calendar_type='shamsi',
            period_year=current_year
        )
        
        # Initialize month tracking
        months_status = {}
        for i in range(1, 13):
            month_str = str(i).zfill(2)
            months_status[month_str] = {
                'month': month_str,
                'rent': float(obj.monthly_rent),
                'paid': Decimal('0'),
                'remaining': float(obj.monthly_rent),
                'is_paid': False,
                'payment_percentage': 0,
                'payment_count': 0,
            }
        
        # Process payments - distribute amount across months
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
        
        # Calculate totals and update status
        total_paid_year = Decimal('0')
        for month_str in months_status:
            paid = months_status[month_str]['paid']
            total_paid_year += paid
            remaining = max(Decimal('0'), obj.monthly_rent - paid)
            is_paid = paid >= obj.monthly_rent * Decimal('0.99')
            payment_percentage = float((paid / obj.monthly_rent * 100) if obj.monthly_rent > 0 else 0)
            
            months_status[month_str]['paid'] = float(paid)
            months_status[month_str]['remaining'] = float(remaining)
            months_status[month_str]['is_paid'] = is_paid
            months_status[month_str]['payment_percentage'] = payment_percentage
        
        # Calculate summary
        months_paid = [m for m, status in months_status.items() if status['is_paid']]
        months_pending = [m for m, status in months_status.items() if not status['is_paid']]
        total_expected_year = obj.monthly_rent * 12
        total_remaining_year = max(Decimal('0'), total_expected_year - total_paid_year)
        
        return {
            'total_paid_year': float(total_paid_year),
            'total_remaining_year': float(total_remaining_year),
            'total_expected_year': float(total_expected_year),
            'months_paid_count': len(months_paid),
            'months_pending_count': len(months_pending),
            'months_paid': months_paid,
            'months_pending': months_pending,
            'months_status': months_status,
            'monthly_rent': float(obj.monthly_rent),
            'currency': obj.currency,
            'year': int(current_year)
        }

    def get_start_date_shamsi(self, obj):
        """Get start date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.start_date).get('shamsi')

    def get_start_date_qamari(self, obj):
        """Get start date in Hijri Qamari calendar"""
        return get_calendar_info(obj.start_date).get('qamari')

    def get_end_date_shamsi(self, obj):
        """Get end date in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.end_date).get('shamsi')

    def get_end_date_qamari(self, obj):
        """Get end date in Hijri Qamari calendar"""
        return get_calendar_info(obj.end_date).get('qamari')
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.shop:
            data['shop'] = {
                'id': instance.shop.id,
                'shop_number': instance.shop.shop_number,
                'name': instance.shop.name
            }
        if instance.tenant:
            data['tenant'] = {
                'id': instance.tenant.id,
                'full_name': instance.tenant.full_name
            }
        return data
    
    def validate(self, attrs):
        # Validate date range
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        
        return attrs
