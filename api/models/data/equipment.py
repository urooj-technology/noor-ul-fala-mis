from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from api.models.data.base import BaseModel


class EquipmentCategory(BaseModel):
    """Equipment type grouping — e.g. furniture, computers."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Equipment Category'
        verbose_name_plural = 'Equipment Categories'

    def __str__(self):
        return self.name


class Equipment(BaseModel):
    """
    Company equipment tracked in warehouse.
    Stock levels 1–4 are inside the warehouse; level 5 means dispatched/out.
    Prices are informational only — not linked to accounting.
    """

    category = models.ForeignKey(
        EquipmentCategory,
        on_delete=models.PROTECT,
        related_name='equipment_items',
    )
    name = models.CharField(max_length=200)
    barcode = models.CharField(max_length=100, unique=True)
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Reference price only — not synced to accounting',
    )
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    stock_category_1 = models.PositiveIntegerField(default=0)
    stock_category_2 = models.PositiveIntegerField(default=0)
    stock_category_3 = models.PositiveIntegerField(default=0)
    stock_category_4 = models.PositiveIntegerField(default=0)
    stock_category_5 = models.PositiveIntegerField(
        default=0,
        help_text='Dispatched / out of warehouse',
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Equipment'
        verbose_name_plural = 'Equipment'

    def __str__(self):
        return f"{self.barcode} - {self.name}"

    @property
    def warehouse_quantity(self) -> int:
        return (
            self.stock_category_1
            + self.stock_category_2
            + self.stock_category_3
            + self.stock_category_4
        )

    def get_stock_for_category(self, category: int) -> int:
        return getattr(self, f'stock_category_{category}', 0)

    def set_stock_for_category(self, category: int, value: int) -> None:
        setattr(self, f'stock_category_{category}', max(0, value))


class EquipmentStockMovement(BaseModel):
    """Audit log for manual stock transfers between categories."""

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='stock_movements',
    )
    from_category = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Null when adding new stock to warehouse',
    )
    to_category = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    notes = models.TextField(blank=True, null=True)
    moved_by = models.ForeignKey(
        'account.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipment_stock_movements',
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Equipment Stock Movement'
        verbose_name_plural = 'Equipment Stock Movements'

    def __str__(self):
        source = self.from_category or 'new'
        return f"{self.equipment.name}: {source} → {self.to_category} ({self.quantity})"
