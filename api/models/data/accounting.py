from django.db import models
from api.models.data.base import BaseModel
from api.models.data.choices import CURRENCY_CHOICES, DEFAULT_CURRENCY


class AccountType(models.TextChoices):
    ASSET = 'asset', 'Asset'
    LIABILITY = 'liability', 'Liability'
    EQUITY = 'equity', 'Equity'
    INCOME = 'income', 'Income'
    EXPENSE = 'expense', 'Expense'


class AccountCategory(BaseModel):
    """Category model for organizing accounts (e.g., Assets, Liabilities, Income, Expenses)"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    description = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Account(BaseModel):
    """Chart of Accounts - Each account in the double-entry system"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    category = models.ForeignKey(AccountCategory, on_delete=models.PROTECT, related_name='accounts')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    is_detail = models.BooleanField(default=True, help_text="Can post entries to this account")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default=DEFAULT_CURRENCY)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    def get_balance(self):
        """Calculate current balance from journal entries"""
        from django.db.models import Sum
        debits = self.journal_entries.aggregate(total=Sum('debit'))['total'] or 0
        credits = self.journal_entries.aggregate(total=Sum('credit'))['total'] or 0

        # Asset/Expense: Debit increases, Credit decreases
        if self.category.account_type in ['asset', 'expense']:
            return debits - credits
        # Liability/Equity/Income: Credit increases, Debit decreases
        return credits - debits


class JournalEntry(BaseModel):
    """Individual journal entry line (double-entry bookkeeping)"""
    date = models.DateField()
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='journal_entries')
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    description = models.TextField(blank=True, null=True)
    reference = models.CharField(max_length=100, blank=True, null=True)
    transaction = models.ForeignKey('Transaction', on_delete=models.CASCADE, related_name='entries')

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.date} - {self.account.code} - Dr: {self.debit}, Cr: {self.credit}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update account balance
        self.account.balance = self.account.get_balance()
        self.account.save(update_fields=['balance'])


class Transaction(BaseModel):
    """A complete transaction with multiple journal entries"""
    TRANSACTION_TYPES = [
        ('student_payment', 'Student Payment'),
        ('expense', 'Expense'),
        ('payroll', 'Payroll'),
        ('advance', 'Advance Salary'),
        ('rental_income', 'Rental Income'),
        ('other_income', 'Other Income'),
        ('journal', 'Manual Journal Entry'),
        ('opening', 'Opening Balance'),
    ]

    number = models.CharField(max_length=50, unique=True, blank=True)
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='journal')
    reference = models.CharField(max_length=100, blank=True, null=True)
    is_posted = models.BooleanField(default=True)
    posted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.number} - {self.date} - {self.get_transaction_type_display()}"

    def save(self, *args, **kwargs):
        if not self.number:
            # Generate transaction number
            from django.utils import timezone
            import time
            prefix = self.transaction_type[:3].upper()
            # Use timestamp to ensure uniqueness
            timestamp = int(time.time() * 1000000) % 1000000
            self.number = f"{prefix}-{timezone.now().year}-{timestamp:06d}"
        super().save(*args, **kwargs)

    @property
    def total_debit(self):
        return sum(entry.debit for entry in self.entries.all())

    @property
    def total_credit(self):
        return sum(entry.credit for entry in self.entries.all())

    def is_balanced(self):
        """Check if transaction is balanced (debits = credits)"""
        from decimal import Decimal
        return abs(self.total_debit - self.total_credit) < Decimal('0.01')


class FiscalYear(BaseModel):
    """Fiscal year management"""
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name
