# پلان سیستم فیس و پرداخت شاگردان

## خلاصه

این پلان برای بهبود سیستم فیس و پرداخت شاگردان طراحی شده است تا:
1. فیسهای مختلف (داخله، کتاب، یونیفرم، غیره) قابل مدیریت باشند
2. فاصله پرداخت (سیکل) انعطافپذیر و دلخواه باشد
3. فیسها بر اساس صنف و شاگرد قابل تعیین باشند

---

## ساختار فعلی

### مدل Student
- `payment_cycle`: فقط دو گزینه (ماهانه/سالانه) ❌ محدود
- `monthly_fee`, `yearly_fee`: یک فیس کلی ❌ بدون تفکیک

### مدل StudentPayment
- `payment_cycle`: ماهانه/سالانه
- `period_month`, `period_year`: دوره پرداخت

### مشکلات
1. سیکل پرداخت محدود به دو گزینه
2. عدم تفکیک فیسها (داخله، کتاب، یونیفرم)
3. عدم قابلیت تعیین فیس بر اساس صنف

---

## ساختار پیشنهادی

### 1. مدل FeeType (نوع فیس)

```python
class FeeType(models.Model):
    """انواع فیسها - قابل تعریف توسط ادمین"""
    
    FEE_CATEGORIES = [
        ('admission', 'فیس داخله'),
        ('book', 'فیس کتاب'),
        ('uniform', 'فیس یونیفرم'),
        ('transportation', 'فیس حمل و نقل'),
        ('exam', 'فیس امتحان'),
        ('other', 'فیس دیگر'),
    ]
    
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)  # admission, book, uniform
    category = models.CharField(max_length=20, choices=FEE_CATEGORIES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_mandatory = models.BooleanField(default=True)  # آیا برای همه اجباری است؟
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
```

**مثال دادهها:**
| id | name | code | category | is_mandatory |
|----|------|------|----------|--------------|
| 1 | فیس داخله | admission | admission | True |
| 2 | فیس کتاب | book | book | True |
| 3 | فیس یونیفرم | uniform | uniform | False |
| 4 | فیس حمل و نقل | transportation | transportation | False |

---

### 2. مدل ClassFee (فیس بر اساس صنف)

```python
class ClassFee(models.Model):
    """فیس تعیین شده برای هر صنف"""
    
    fee_type = models.ForeignKey(FeeType, on_delete=models.CASCADE, related_name='class_fees')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='fees')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='AFN')
    
    # اگر True: همه شاگردان این صنف باید همین مبلغ را بپردازند
    # اگر False: میتوان برای هر شاگرد مبلغ متفاوت تعیین کرد
    is_fixed = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['fee_type', 'class_level']
        ordering = ['class_level__level', 'fee_type__name']
    
    def __str__(self):
        return f"{self.class_level.name} - {self.fee_type.name}: {self.amount} {self.currency}"
```

**مثال دادهها:**
| fee_type | class_level | amount | is_fixed |
|----------|-------------|--------|----------|
| admission | Class 1 | 500 | True |
| book | Class 1 | 200 | True |
| uniform | Class 1 | 300 | False |
| admission | Class 2 | 600 | True |
| book | Class 2 | 250 | True |

---

### 3. تغییرات در مدل Student

```python
class Student(BaseModel):
    # ... فیلدهای موجود ...
    
    # حذف: payment_cycle (CharField)
    # حذف: monthly_fee, yearly_fee
    
    # جدید: فاصله پرداخت به ماه
    payment_interval_months = models.PositiveIntegerField(
        default=1,
        help_text='تعداد ماه برای هر پرداخت (1=ماهانه، 2=دو ماهه، 3=سه ماهه، 12=سالانه)'
    )
    
    # شروع دوره پرداخت
    payment_start_date = models.DateField(
        null=True, 
        blank=True,
        help_text='تاریخ شروع اولین دوره پرداخت'
    )
    
    @property
    def payment_cycle_display(self):
        """نمایش متن سیکل پرداخت"""
        intervals = {
            1: 'ماهانه',
            2: 'دو ماهه',
            3: 'سه ماهه',
            4: 'چهار ماهه',
            6: 'شش ماهه',
            12: 'سالانه',
        }
        return intervals.get(self.payment_interval_months, f'هر {self.payment_interval_months} ماه')
    
    def get_total_expected_fees(self):
        """محاسبه کل فیسهای مورد انتظار شاگرد"""
        from api.models.data.student_fee import StudentFee
        return StudentFee.objects.filter(
            student=self
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    def get_total_paid_fees(self):
        """محاسبه کل فیسهای پرداخت شده"""
        from api.models.data.student_fee import StudentFee
        return StudentFee.objects.filter(
            student=self, 
            is_paid=True
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    def get_remaining_fees(self):
        """محاسبه مانده فیس"""
        return self.get_total_expected_fees() - self.get_total_paid_fees()
    
    def get_fees_summary(self):
        """خلاصه مالی کامل"""
        fees = self.student_fees.all()
        summary = {
            'total_expected': self.get_total_expected_fees(),
            'total_paid': self.get_total_paid_fees(),
            'remaining': self.get_remaining_fees(),
            'fees_by_type': {},
        }
        for fee in fees:
            type_name = fee.fee_type.name
            if type_name not in summary['fees_by_type']:
                summary['fees_by_type'][type_name] = {
                    'expected': Decimal('0'),
                    'paid': Decimal('0'),
                    'remaining': Decimal('0'),
                }
            summary['fees_by_type'][type_name]['expected'] += fee.amount
            if fee.is_paid:
                summary['fees_by_type'][type_name]['paid'] += fee.amount
        # محاسبه مانده هر نوع فیس
        for type_name in summary['fees_by_type']:
            summary['fees_by_type'][type_name]['remaining'] = (
                summary['fees_by_type'][type_name]['expected'] - 
                summary['fees_by_type'][type_name]['paid']
            )
        return summary
```

---

### 4. مدل StudentFee (فیس اختصاصی شاگرد)

```python
class StudentFee(models.Model):
    """فیس اختصاصی هر شاگرد"""
    
    student = models.ForeignKey(
        Student, 
        on_delete=models.CASCADE, 
        related_name='student_fees'
    )
    fee_type = models.ForeignKey(FeeType, on_delete=models.PROTECT)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='AFN')
    
    # وضعیت پرداخت
    is_paid = models.BooleanField(default=False)
    paid_date = models.DateField(null=True, blank=True)
    
    # دوره مربوطه (اختیاری)
    period_month = models.CharField(max_length=2, blank=True, null=True)
    period_year = models.CharField(max_length=4, blank=True, null=True)
    
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['student', 'fee_type', 'period_year', 'period_month']
        indexes = [
            models.Index(fields=['student', 'is_paid']),
            models.Index(fields=['fee_type']),
        ]
    
    def __str__(self):
        status = 'پرداخت شده' if self.is_paid else 'پرداخت نشده'
        return f"{self.student.full_name} - {self.fee_type.name}: {self.amount} ({status})"
    
    def mark_as_paid(self, payment_date=None):
        """ثبت به عنوان پرداخت شده"""
        self.is_paid = True
        self.paid_date = payment_date or timezone.now().date()
        self.save()
```

---

### 5. تغییرات در StudentPayment

```python
class StudentPayment(BaseModel):
    # ... فیلدهای موجود ...
    
    # جدید: ارتباط با فیسهای شاگرد
    student_fees = models.ManyToManyField(
        StudentFee, 
        blank=True,
        related_name='payments',
        help_text='فیسهایی که با این پرداخت پوشش داده شده'
    )
    
    # حذف: payment_cycle (از student خوانده میشود)
    
    @property
    def payment_interval_months(self):
        """خواندن فاصله پرداخت از شاگرد"""
        return self.student.payment_interval_months if self.student else 1
```

---

## API Endpoints

### FeeType Endpoints
```
GET    /api/fee-types/              # لیست انواع فیس
POST   /api/fee-types/              # ایجاد نوع فیس جدید
GET    /api/fee-types/{id}/         # جزئیات نوع فیس
PUT    /api/fee-types/{id}/         # ویرایش نوع فیس
DELETE /api/fee-types/{id}/         # حذف نوع فیس
```

### ClassFee Endpoints
```
GET    /api/class-fees/             # لیست فیس صنفها
POST   /api/class-fees/             # ایجاد فیس صنف
GET    /api/class-fees/{id}/        # جزئیات
PUT    /api/class-fees/{id}/        # ویرایش
DELETE /api/class-fees/{id}/        # حذف
GET    /api/class-fees/by_class/{class_level_id}/  # فیسهای یک صنف
```

### StudentFee Endpoints
```
GET    /api/student-fees/           # لیست فیسهای شاگردان
POST   /api/student-fees/           # ایجاد فیس شاگرد
GET    /api/student-fees/{id}/      # جزئیات
PUT    /api/student-fees/{id}/      # ویرایش
DELETE /api/student-fees/{id}/      # حذف
GET    /api/student-fees/by_student/{student_id}/  # فیسهای یک شاگرد
POST   /api/student-fees/generate_for_student/     # تولید خودکار فیسها از صنف
```

### Student Endpoints (بهبود یافته)
```
GET    /api/students/{id}/fees_summary/   # خلاصه مالی شاگرد
POST   /api/students/{id}/calculate_payment_schedule/  # محاسبه برنامه پرداخت
```

---

## فرآیند کار

### 1. ثبت شاگرد جدید
```
1. کارگر اطلاعات شخصی را وارد میکند
2. صنف را انتخاب میکند
3. فاصله پرداخت را تعیین میکند (مثلاً 3 ماه)
4. سیستم به صورت خودکار فیسهای پیشفرض صنف را برای شاگرد کپی میکند
5. کارگر میتواند فیسها را ویرایش کند (اگر is_fixed=False باشد)
```

### 2. ثبت پرداخت
```
1. شاگرد را انتخاب میکند
2. سیستم فیسهای پرداخت نشده را نمایش میدهد
3. کارگر مبلغ پرداختی را وارد میکند
4. کارگر انتخاب میکند کدام فیسها پوشش داده شوند
5. پرداخت ثبت میشود
```

### 3. مشاهده وضعیت مالی
```
1. شاگرد را انتخاب میکند
2. سیستم نمایش میدهد:
   - کل فیسها: 1500 افغانی
   - پرداخت شده: 800 افغانی
   - مانده: 700 افغانی
   - تفکیک:
     * فیس داخله: 500 (پرداخت شده)
     * فیس کتاب: 400 (پرداخت نشده)
     * فیس یونیفرم: 300 (پرداخت نشده)
     * فیس حمل و نقل: 300 (پرداخت شده)
```

---

## Frontend Components

### 1. تب فیسها در فرم شاگرد
```
┌─────────────────────────────────────────────────────────┐
│ فیسهای شاگرد                                             │
├─────────────────────────────────────────────────────────┤
│ فاصله پرداخت: [___3___] ماه                             │
│                                                         │
│ ┌───────────────────────────────────────────────────┐   │
│ │ نوع فیس       │ مبلغ    │ وضعیت    │ عملیات     │   │
│ ├───────────────┼─────────┼──────────┼────────────┤   │
│ │ فیس داخله     │ 500 AFN │ اجباری   │ ─          │   │
│ │ فیس کتاب      │ 200 AFN │ اجباری   │ ویرایش     │   │
│ │ فیس یونیفرم   │ 300 AFN │ اختیاری  │ ویرایش/حذف │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ [+ افزودن فیس دیگر]                                     │
│                                                         │
│ کل فیسها: 1000 AFN                                     │
└─────────────────────────────────────────────────────────┘
```

### 2. فرم ثبت پرداخت
```
┌─────────────────────────────────────────────────────────┐
│ ثبت پرداخت                                               │
├─────────────────────────────────────────────────────────┤
│ شاگرد: احمد محمدی                                       │
│ فاصله پرداخت: هر 3 ماه                                  │
│                                                         │
│ فیسهای پرداخت نشده:                                     │
│ ┌───────────────────────────────────────────────────┐   │
│ │ ☑ فیس داخله    │ 500 AFN │ باقی مانده: 500 AFN   │   │
│ │ ☑ فیس کتاب     │ 200 AFN │ باقی مانده: 200 AFN   │   │
│ │ ☐ فیس یونیفرم  │ 300 AFN │ باقی مانده: 300 AFN   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ مبلغ پرداختی: [_______700_______] AFN                  │
│                                                         │
│ تاریخ پرداخت: [1404/02/15]                             │
│                                                         │
│ [ثبت پرداخت]                                            │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### مرحله 1: ایجاد مدلهای جدید
1. ایجاد FeeType, ClassFee, StudentFee
2. اجرای migration

### مرحله 2: انتقال دادهها
1. ایجاد FeeType های پیشفرض (داخله، کتاب، یونیفرم)
2. انتقال monthly_fee/yearly_fee فعلی به StudentFee
3. تبدیل payment_cycle به payment_interval_months

### مرحله 3: بهروزرسانی API
1. افزودن endpoints جدید
2. بهبود serializers

### مرحله 4: بهروزرسانی Frontend
1. افزودن تب فیسها
2. بهبود فرم پرداخت
3. نمایش خلاصه مالی

---

## سوالات باز

1. **تاریخ سررسید:** آیا هر فیس باید تاریخ سررسید (due_date) داشته باشد؟
2. **تخفیف:** آیا نیاز به سیستم تخفیف برای فیسها دارید؟
3. **بازپرداخت:** اگر شاگرد انصراف داد، چگونه فیسها مدیریت میشوند؟
4. **گزارش:** چه گزارشهایی از فیسها نیاز دارید؟

---

## زمان تخمینی

| مرحله | مدت زمان |
|-------|----------|
| Backend Models & Migrations | 2-3 ساعت |
| Backend API & Serializers | 2-3 ساعت |
| Frontend Components | 4-5 ساعت |
| Testing & Bug Fixes | 2-3 ساعت |
| **مجموع** | **10-14 ساعت** |
