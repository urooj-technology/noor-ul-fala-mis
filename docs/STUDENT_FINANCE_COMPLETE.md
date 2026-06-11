# Student Finance System - Complete Implementation

## Overview
Complete student finance system combining fees and payments in one unified file with full localization.

## Files Summary

### New Files Created
1. **api/models/data/student_finance.py** - All models (FeeType, ClassFee, StudentFeeAssignment, PaymentPlan, StudentInvoice, StudentPayment)
2. **api/serializers/data/student_finance.py** - All serializers with localization
3. **api/views/data/student_finance.py** - All ViewSets with custom actions

### Removed Files (Merged)
- api/models/data/fee_type.py - Moved to student_finance.py
- api/models/data/class_fee.py - Moved to student_finance.py
- api/models/data/student_fee_assignment.py - Moved to student_finance.py
- api/models/data/payment_plan.py - Moved to student_finance.py
- api/models/data/student_invoice.py - Moved to student_finance.py
- api/models/data/student_payment.py - Moved to student_finance.py
- api/serializers/data/student_payment.py - Moved to student_finance.py
- api/views/data/student_payment.py - Moved to student_finance.py

### Updated Files
1. **api/models/data/__init__.py** - Updated exports
2. **api/serializers/data/__init__.py** - Updated exports
3. **api/views/data/__init__.py** - Updated exports
4. **api/models/data/student.py** - Added new fields and methods
5. **api/models/data/student_payment.py** - Updated relationships
6. **api/serializers/data/student.py** - Updated financial_summary
7. **api/views/data/student.py** - Updated financial_summary endpoint
8. **api/urls.py** - Registered new endpoints

## Models Structure

### FeeType
```python
class FeeType(BaseModel):
    name, name_fa, name_ps  # Multi-language
    code, category
    description, description_fa, description_ps
    is_active, is_mandatory
```

### ClassFee
```python
class ClassFee(BaseModel):
    fee_type, class_level
    amount, currency
    is_active, notes
```

### StudentFeeAssignment
```python
class StudentFeeAssignment(BaseModel):
    student, fee_type
    amount, currency
    is_mandatory, is_active
```

### PaymentPlan
```python
class PaymentPlan(BaseModel):
    student
    interval_months  # Flexible: 1, 2, 3, 4, 5, 6, 12
    start_date, end_date
    is_active, notes
```

### StudentInvoice
```python
class StudentInvoice(BaseModel):
    student, fee_type
    amount, currency
    due_date, period_start, period_end
    period_month, period_year
    status: pending/partial/paid/overdue/cancelled
```

### StudentPayment
```python
class StudentPayment(BaseModel):
    student
    amount, currency
    payment_date, payment_status
    payment_cycle (deprecated)
    period_year, period_month
    reference_number, description
    receipt
    invoices (ManyToMany)
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/fee-types/` | Fee type management |
| `GET/POST /api/class-fees/` | Class fee management |
| `GET/POST /api/student-fee-assignments/` | Student fee assignments |
| `GET/POST /api/payment-plans/` | Payment plan management |
| `GET/POST /api/student-invoices/` | Student invoices |
| `GET/POST /api/student-payments/` | Student payments |

## Custom Actions

### FeeTypeViewSet
- None

### ClassFeeViewSet
- `GET /api/class-fees/by_class/?class_level={id}`

### StudentFeeAssignmentViewSet
- `GET /api/student-fee-assignments/by_student/?student={id}`
- `POST /api/student-fee-assignments/create_from_class/`

### PaymentPlanViewSet
- None

### StudentInvoiceViewSet
- `GET /api/student-invoices/by_student/?student={id}`
- `GET /api/student-invoices/pending/`
- `GET /api/student-invoices/overdue/`
- `POST /api/student-invoices/{id}/mark_paid/`
- `POST /api/student-invoices/generate_for_period/`

### StudentPaymentViewSet
- `GET /api/student-payments/daily_summary/`
- `GET /api/student-payments/monthly_summary/`
- `POST /api/student-payments/{id}/mark_as_paid/`
- `POST /api/student-payments/{id}/mark_as_refunded/`
- `GET /api/student-payments/financial_info/?student={id}&month={m}&year={y}`

## Key Features

### 1. Flexible Payment Intervals
- Any number of months (1, 2, 3, 4, 5, 6, 12)
- Configurable per student via PaymentPlan

### 2. Multiple Fee Types
- Admission, Book, Uniform, Transportation, Exam, Other
- Custom fee types can be added

### 3. Class-Based Pricing
- Default fees per class level
- Override per student

### 4. Invoicing System
- Automatic invoice generation
- Track pending/paid/overdue status
- Partial payments support

### 5. Multi-Currency Support
- Each fee/payment can have its own currency

### 6. Full Localization
- English (primary), Dari (fa), Pashto (ps)
- All models have name_fa, name_ps, description_fa, description_ps

## Localization

All models support:
- English (primary)
- Dari/Farsi (name_fa, description_fa)
- Pashto (name_ps, description_ps)

Use `?lang=fa` or `?lang=ps` in API requests.

## Testing

```bash
# Run migrations
python manage.py makemigrations
python manage.py migrate

# Test endpoints
curl http://localhost:9000/api/fee-types/
curl http://localhost:9000/api/class-fees/by_class/?class_level=1
curl http://localhost:9000/api/student-payments/
```

## Next Steps

1. Run migrations
2. Create initial data (fee types, class fees)
3. Create PaymentPlan for students
4. Generate StudentFeeAssignment
5. Generate StudentInvoice
6. Implement frontend components
