# Payroll Section - Afghanistan Calendar Implementation Complete

## Backend Updates

### Updated Serializer: `api/serializers/data/payroll.py`

**Added Calendar Fields:**
- `payment_date_shamsi` - Afghanistan Shamsi calendar format
- `payment_date_qamari` - Hijri Qamari calendar format

**Implementation:**
```python
from api.utils.calendar import get_calendar_info

class PayrollSerializer(DataRootSerializer):
    # ... existing fields ...
    
    payment_date_shamsi = serializers.SerializerMethodField(read_only=True)
    payment_date_qamari = serializers.SerializerMethodField(read_only=True)
    
    def get_payment_date_shamsi(self, obj):
        return get_calendar_info(obj.payment_date).get('shamsi')
    
    def get_payment_date_qamari(self, obj):
        return get_calendar_info(obj.payment_date).get('qamari')
```

## Frontend Updates

### 1. AddPayroll (`frontend/src/pages/payroll/AddPayroll.tsx`)

**Updated:**
- Imported `ShamsiDatePicker` component
- Replaced HTML `<input type="date">` with `<ShamsiDatePicker>` for payment_date field
- ShamsiDatePicker automatically converts to Gregorian when saving to API

**Changes:**
```tsx
import { ShamsiDatePicker } from '@/components/ui/shamsi-datepicker';

// Before
<Input 
  type="date"
  value={formData.payment_date} 
  onChange={e => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
/>

// After
<ShamsiDatePicker
  value={formData.payment_date}
  onChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
  label={t('payroll.paymentDate')}
/>
```

### 2. EditPayroll (`frontend/src/pages/payroll/EditPayroll.tsx`)

**Updated:**
- Imported `ShamsiDatePicker` component
- Replaced HTML `<input type="date">` with `<ShamsiDatePicker>` for payment_date field

### 3. PayrollList (`frontend/src/pages/payroll/PayrollList.tsx`)

**Updated Date Column:**
```tsx
{
  key: 'payment_date',
  title: t('payroll.paymentDate'),
  render: (value, record) => {
    return (
      <div className="space-y-1">
        {record.payment_date_shamsi ? (
          <div className="text-sm">
            {record.payment_date_shamsi.formatted}
            <span className="text-xs text-muted-foreground ml-2">(شمسی)</span>
          </div>
        ) : (
          <div className="text-muted-foreground">-</div>
        )}
        {record.payment_date_qamari && (
          <div className="text-xs text-muted-foreground">
            {record.payment_date_qamari.formatted}
            <span className="ml-1">(قمری)</span>
          </div>
        )}
      </div>
    );
  }
}
```

### 4. PayrollDetails (`frontend/src/pages/payroll/PayrollDetails.tsx`)

**Updated Payment Date Display:**
```tsx
<p className="text-base text-gray-600 dark:text-gray-400text-xs">{t('payroll.paymentDate')}</p>
<div className="space-y-1">
  {payroll.payment_date_shamsi ? (
    <p className="font-medium text-sm">
      {payroll.payment_date_shamsi.formatted}
      <span className="text-xs text-muted-foreground ml-2">(شمسی)</span>
    </p>
  ) : (
    <p className="text-muted-foreground">N/A</p>
  )}
  {payroll.payment_date_qamari && (
    <p className="text-xs text-muted-foreground">
      {payroll.payment_date_qamari.formatted}
      <span className="ml-1">(قمری)</span>
    </p>
  )}
</div>
```

## API Response Example

When fetching payroll data, the API now returns:

```json
{
  "id": 1,
  "employee": 123,
  "month": "january",
  "year": 2024,
  "salary": 1500.00,
  "currency": "AFN",
  "payment_date": "2024-01-31",
  "employee_details": {
    "id": 123,
    "full_name": "Ahmad Khan",
    "position": "Sales Manager",
    "salary": 1500.00
  },
  "currency_details": {
    "code": "AFN",
    "name": "AFN - Afghan Afghani"
  },
  "payment_date_shamsi": {
    "year": 1402,
    "month": 11,
    "day": 11,
    "formatted": "1402/11/11",
    "formatted_long": "11 دلو 1402",
    "month_name_dari": "دلو",
    "month_name_pashto": "سلواغه"
  },
  "payment_date_qamari": {
    "year": 1445,
    "month": 3,
    "day": 21,
    "formatted": "1445/03/21",
    "formatted_long": "21 ربيع الثاني 1445",
    "month_name": "ربيع الثاني"
  }
}
```

## Features

1. **Shamsi Calendar (شمسی)**: Afghanistan Persian Solar Calendar
   - Uses Dari/Pashto month names
   - Afghanistan-specific year calculations
   - Example: 1402/11/11 (11 دلو 1402)

2. **Qamari Calendar (قمری)**: Hijri Lunar Calendar
   - Uses Arabic month names
   - Islamic calendar year
   - Example: 1445/03/21 (21 ربيع الثاني 1445)

3. **Automatic Conversion**: 
   - User selects date in Shamsi calendar
   - Frontend converts to Gregorian (2024-01-31)
   - API stores in database as Gregorian
   - API returns both Shamsi and Qamari formats

## Testing

1. **Add Payroll**: Go to `/payroll/add` - select payment date using Shamsi picker
2. **List Payrolls**: View table showing both Shamsi and Qamari dates
3. **Payroll Details**: View detailed payment date in both calendars

## Files Modified

**Backend:**
- `api/serializers/data/payroll.py` - Added calendar fields

**Frontend:**
- `frontend/src/pages/payroll/AddPayroll.tsx` - Shamsi date picker
- `frontend/src/pages/payroll/EditPayroll.tsx` - Shamsi date picker
- `frontend/src/pages/payroll/PayrollList.tsx` - Dual calendar display
- `frontend/src/pages/payroll/PayrollDetails.tsx` - Dual calendar display
