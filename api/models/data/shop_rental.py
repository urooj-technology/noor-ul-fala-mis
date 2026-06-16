from django.db import models
from django.utils import timezone
from api.models.data.base import BaseModel
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY


class ShopStatus(models.Model):
    """Shop status options"""
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('rented', 'Rented'),
        ('maintenance', 'Maintenance'),
        ('reserved', 'Reserved'),
    ]
    
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Shop(BaseModel):
    """Shop management model"""
    shop_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    area = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='available')
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['shop_number']
    
    def __str__(self):
        return f"Shop {self.shop_number} - {self.name}"


class Tenant(BaseModel):
    """Tenant information"""
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    tazkira_number = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['full_name']
    
    def __str__(self):
        return f"{self.full_name} - {self.phone}"


class ShopRental(BaseModel):
    """Shop rental tracking"""
    RENTAL_STATUSES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('renewed', 'Renewed'),
    ]
    
    shop = models.ForeignKey(
        Shop,
        on_delete=models.CASCADE,
        related_name='rentals'
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='rentals'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_rent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=DEFAULT_CURRENCY)
    rental_status = models.CharField(max_length=20, choices=RENTAL_STATUSES, default='active')
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.shop.shop_number} - {self.tenant.full_name}"
    
    @property
    def is_active(self):
        """Check if rental is currently active"""
        today = timezone.now().date()
        return self.rental_status == 'active' and self.start_date <= today <= self.end_date
    
    @property
    def is_expired(self):
        """Check if rental has expired"""
        return timezone.now().date() > self.end_date and self.rental_status == 'active'
