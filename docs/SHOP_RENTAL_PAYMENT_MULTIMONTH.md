# Shop Rental Payment - Multi-Month Support Implementation

## Overview
This implementation adds multi-month payment support to the shop rental payment system, similar to the student payment system. Users can now pay for multiple months at once, and track payments per month using Shamsi (Afghanistan Solar) or Qamari (Hijri Lunar) calendars.

## Changes Made

### 1. Backend Model Changes (`api/models/data/shop_rental_payment.py`)

**New Fields Added:**
- `period_months` (JSONField): Stores list of month numbers (e.g., ["01", "02", "03"])
- `calendar_type` (CharField): Stores calendar type ('shamsi' or 'qamari')
- `period_month` (CharField): Kept for backward compatibility

**Key Features:**
- Supports multiple months in a single payment
- Calendar-aware (Shamsi/Qamari)
- Auto-migration of legacy `period_month` to `period_months`
- `months_display` property for formatted output

### 2. Backend Serializer Changes (`api/serializers/data/shop_rental_payment.py`)

**New Fields:**
- `period_months_display`: Returns month names in Dari, Pashto, or Arabic based on calendar type
- `months_count`: Returns number of months in payment

**Enhanced Features:**
- Month normalization (zero-padded strings)
- Multi-month validation
- Calendar-aware month name display

### 3. Backend View Changes (`api/views/data/shop_rental_payment.py`)

**Enhanced `create()` Method:**
- Accepts `period_months` array
- Accepts `calendar_type` parameter
- Creates payments for multiple months in one request
- Validates all months (1-12)

**New Endpoint: `rental_monthly_status`**
- Returns payment status for each month of a year
- Shows: paid amount, remaining amount, rent, payment percentage
- Calendar-type aware

**Enhanced `rental_financial_info` Endpoint:**
- Returns per-month breakdown when no specific month is provided
- Shows summary with months paid/pending counts
- Supports calendar type filtering

**New Filters:**
- `calendar_type`: Filter by calendar type
- `period_year`: Filter by year

### 4. Service Layer (`api/services/shop_rental_payment_service.py`)

**New Service Class: `ShopRentalPaymentService`**

**Methods:**
- `get_monthly_payment_status(rental_id, year, calendar_type)`: Returns detailed monthly breakdown
- `create_multi_month_payment()`: Creates payment for multiple months with transaction safety

### 5. Database Migration (`api/migrations/0009_shop_rental_payment_multimonth.py`)

Adds new fields to `ShopRentalPayment` model:
- `period_months` (JSONField)
- `calendar_type` (CharField)
- `period_month` (CharField - legacy)
- Index on `period_year`

### 6. Frontend - Add Payment Form (`frontend/src/pages/shop-rental/AddShopRentalPayment_New.tsx`)

**New Component: `MonthMultiSelect`**
- Multi-select dropdown for months
- Shows month names in selected calendar (Shamsi/Qamari)
- Displays payment amount per month
- Badge display of selected months

**Enhanced Form Features:**
- Multi-month selection
- Calendar type selector (Shamsi/Qamari)
- Real-time total calculation (months × amount per month)
- Enhanced financial info display showing yearly summary

**New Form Fields:**
- `period_months`: Multi-select for months
- `calendar_type`: Shamsi or Qamari
- `amount`: Amount per month (not total)

**Display Features:**
- Total payment = months count × amount per month
- Yearly summary: paid, remaining, months paid count
- Per-month breakdown table

## API Endpoints

### Create Payment (POST `/api/shop-rental-payments/`)
```json
{
  "rental": 1,
  "amount": 5000,
  "period_months": ["01", "02", "03"],
  "period_year": "1403",
  "calendar_type": "shamsi",
  "payment_date": "2024-01-15",
  "payment_status": "completed",
  "description": "Quarterly rent payment"
}
```

### Get Rental Financial Info (GET `/api/shop-rental-payments/rental_financial_info/`)
**Query Parameters:**
- `rental_id`: Required
- `year`: Optional (default: current year)
- `calendar_type`: Optional (default: 'shamsi')
- `month`: Optional (if not provided, returns full year breakdown)

**Response (without month parameter):**
```json
{
  "rental_id": 1,
  "shop": {...},
  "tenant": {...},
  "monthly_rent": 5000,
  "year": "1403",
  "calendar_type": "shamsi",
  "months": {
    "01": {
      "month": "01",
      "rent": 5000,
      "paid": 5000,
      "remaining": 0,
      "is_paid": true,
      "payment_percentage": 100,
      "payment_count": 1
    },
    ...
  },
  "summary": {
    "total_rent_year": 60000,
    "total_paid_year": 15000,
    "total_remaining_year": 45000,
    "months_paid_count": 3,
    "months_pending_count": 9
  }
}
```

### Get Monthly Status (GET `/api/shop-rental-payments/rental_monthly_status/`)
**Query Parameters:**
- `rental_id`: Required
- `year`: Optional
- `calendar_type`: Optional

## Calendar Support

### Shamsi Months (Afghanistan)
1. حمل (Hamal) - Aries
2. ثور (Sawr) - Taurus
3. جوزا (Jawza) - Gemini
4. سرطان (Saratan) - Cancer
5. اسد (Asad) - Leo
6. سنبله (Sonbola) - Virgo
7. میزان (Mizan) - Libra
8. عقرب (Aqrab) - Scorpio
9. قوس (Qaws) - Sagittarius
10. جدی (Jadi) - Capricorn
11. دلو (Dalwa) - Aquarius
12. حوت (Hoot) - Pisces

### Qamari Months (Hijri Lunar)
1. محرم الحرام (Muharram)
2. صفر المظفر (Safar)
3. ربيع الاول (Rabi al-Awwal)
4. ربيع الثاني (Rabi al-Thani)
5. جمادی الاول (Jumada al-Awwal)
6. جمادی الثاني (Jumada al-Thani)
7. رجب المرجب (Rajab)
8. شعبان المعظم (Sha'ban)
9. رمضان المبارک (Ramadan)
10. شوال المکرم (Shawwal)
11. ذی القعده (Dhu al-Qi'dah)
12. ذی الحجه (Dhu al-Hijjah)

## Benefits

1. **Multi-Month Payment**: Pay for multiple months in one transaction
2. **Calendar Flexibility**: Support for both Shamsi and Qamari calendars
3. **Better Tracking**: See exactly which months are paid/unpaid
4. **Financial Overview**: Quick summary of yearly payment status
5. **Backward Compatible**: Legacy `period_month` field still works

## Usage Examples

### Pay for 3 Months (Shamsi Calendar)
```javascript
const payment = {
  rental: 1,
  amount: 5000,  // Per month
  period_months: ["01", "02", "03"],  // Hamal, Sawr, Jawza
  period_year: "1403",
  calendar_type: "shamsi",
  payment_date: "2024-03-21"
};
// Total payment: 15,000 AFN (5000 × 3 months)
```

### Pay for Ramadan (Qamari Calendar)
```javascript
const payment = {
  rental: 1,
  amount: 5000,
  period_months: ["09"],  // Ramadan
  period_year: "1446",
  calendar_type: "qamari",
  payment_date: "2024-03-11"
};
```

## Migration Steps

1. Run migration:
   ```bash
   python manage.py migrate
   ```

2. Replace old frontend component:
   ```bash
   mv frontend/src/pages/shop-rental/AddShopRentalPayment_New.tsx frontend/src/pages/shop-rental/AddShopRentalPayment.tsx
   ```

3. Update imports in route files if necessary

4. Test with both Shamsi and Qamari calendars

## Testing Checklist

- [ ] Create payment with single month
- [ ] Create payment with multiple months
- [ ] Verify calendar type is saved correctly
- [ ] Check month names display correctly (Dari/Pashto/Arabic)
- [ ] Verify total calculation (months × amount)
- [ ] Test rental_financial_info endpoint with and without month parameter
- [ ] Test rental_monthly_status endpoint
- [ ] Verify backward compatibility with legacy payments
- [ ] Test filtering by calendar_type and period_year
