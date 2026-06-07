from rest_framework import serializers
from django.db.models import Sum
from api.models.data.shop_rental import Shop, Tenant, ShopRental
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
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
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
            'paid_amount', 'remaining_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['is_active', 'is_expired', 'currency_details', 'paid_amount', 'remaining_amount', 'start_date_shamsi', 'start_date_qamari', 'end_date_shamsi', 'end_date_qamari']
    
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
    
    def get_paid_amount(self, obj):
        from django.utils import timezone
        from django.db.models import Q
        from decimal import Decimal
        from api.models.data.shop_rental_payment import ShopRentalPayment
        
        current_month = timezone.now().month
        current_year = timezone.now().year
        month_str = str(current_month).zfill(2)
        
        paid = ShopRentalPayment.objects.filter(
            rental=obj,
            period_year=str(current_year),
            payment_status='completed'
        ).filter(
            Q(period_month=month_str) | Q(period_month=str(current_month))
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        return float(paid)
    
    def get_remaining_amount(self, obj):
        paid = self.get_paid_amount(obj)
        return float(obj.monthly_rent) - paid

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
