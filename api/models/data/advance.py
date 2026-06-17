from django.utils import timezone
from django.db import models
from api.models.data.base import BaseModel
from api.models.data.employee import Employee   
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY


class Advance(BaseModel):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='advances'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=DEFAULT_CURRENCY)
    reason = models.CharField(max_length=255, blank=True, null=True)
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()  # 1-12 for Shamsi months
    payment_date = models.DateField(default=timezone.now)
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.amount} ({self.month}/{self.year})"