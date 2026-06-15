from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField
from api.models.data.base import BaseModel
from api.models.data.shop_rental import ShopRental
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY
import json


class ShopRentalPayment(BaseModel):
    """Individual rental payments with multi-month support"""
    PAYMENT_STATUSES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    rental = models.ForeignKey(
        ShopRental,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=DEFAULT_CURRENCY)
    payment_date = models.DateField(default=timezone.now)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUSES, default='completed')
    
    # Multi-month support
    period_months = models.JSONField(
        default=list, 
        blank=True, 
        help_text='List of month numbers (e.g., ["01", "02", "03"] for Shamsi or Qamari months)'
    )
    period_year = models.CharField(max_length=4, blank=True, null=True, help_text='Year (Shamsi or Qamari based on calendar type)')
    
    # Calendar type for this payment
    calendar_type = models.CharField(
        max_length=10, 
        choices=[('shamsi', 'Shamsi'), ('qamari', 'Qamari')],
        default='shamsi',
        help_text='Calendar type used for period_months and period_year'
    )
    
    # Legacy fields (kept for backward compatibility)
    period_month = models.CharField(max_length=2, blank=True, null=True, help_text='DEPRECATED: Use period_months')
    
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    receipt = models.FileField(upload_to='shop_rental_payments/receipts/', blank=True, null=True)
    transaction = models.ForeignKey(
        'api.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rental_payments'
    )

    class Meta:
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['rental', 'payment_date']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['period_year']),
        ]

    def __str__(self):
        return f"{self.rental.tenant.full_name} - {self.amount} ({self.payment_date})"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            count = ShopRentalPayment.objects.filter(
                payment_date__year=timezone.now().year
            ).count() + 1
            self.reference_number = f"RENT-PAY-{timezone.now().year}-{count:06d}"
        
        # Migrate legacy period_month to period_months if needed
        if self.period_month and not self.period_months:
            self.period_months = [self.period_month]
        
        super().save(*args, **kwargs)
    
    @property
    def months_display(self):
        """Return formatted months string"""
        if not self.period_months:
            return '-'
        return ', '.join(self.period_months)
