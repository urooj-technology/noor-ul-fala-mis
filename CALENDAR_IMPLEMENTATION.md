# Afghanistan Calendar Implementation Guide

## What Has Been Implemented

### 1. Backend (Django)

#### New Files Created:
- **`api/utils/calendar.py`** - Calendar conversion utilities for Afghanistan Shamsi (Jalali) and Qamari (Hijri Lunar) dates

#### Updated Files:
- **`requirements.txt`** - Added `jdatetime==5.0.0` and `hijri-converter==2.3.1`
- **`account/models.py`** - Added `preferred_calendar` field to User model with choices: Gregorian, Shamsi, Qamari
- **`account/serializers.py`** - Updated ProfileUpdateSerializer to include preferred_calendar
- **`api/serializers/data/student.py`** - Added Shamsi and Qamari date fields for student's date_of_birth and registration_date

### 2. Frontend (React)

#### New Files Created:
- **`frontend/src/utils/calendar.ts`** - TypeScript calendar conversion utilities with Afghanistan month names
- **`frontend/src/components/ui/shamsi-datepicker.tsx`** - Shamsi (Jalali) DatePicker component
- **`frontend/src/components/ui/qamari-datepicker.tsx`** - Qamari (Hijri Lunar) DatePicker component
- **`frontend/src/components/ui/date-picker.tsx`** - Unified DatePicker that switches between calendar types

#### Updated Files:
- **`frontend/src/pages/students/AddStudent.tsx`** - Updated to use ShamsiDatePicker for date_of_birth and registration_date

## How It Works

### Data Flow:
1. **Frontend Input**: User selects date in Shamsi calendar (e.g., 1403/01/01)
2. **Conversion**: DatePicker converts Shamsi to Gregorian (ISO format: 2024-03-20)
3. **API Storage**: Date stored in database as Gregorian (2024-03-20)
4. **API Response**: Backend returns both Gregorian AND Shamsi/Qamari formats
5. **Frontend Display**: UI displays date in user's preferred calendar format

### Example API Response:

```json
{
  "id": 1,
  "full_name": "محمد",
  "date_of_birth": "2010-05-15",
  "date_of_birth_shamsi": {
    "year": 1389,
    "month": 2,
    "day": 25,
    "formatted": "1389/02/25",
    "formatted_long": "25 ثور 1389",
    "month_name_dari": "ثور",
    "month_name_pashto": "غوی"
  },
  "date_of_birth_qamari": {
    "year": 1431,
    "month": 5,
    "day": 1,
    "formatted": "1431/05/01",
    "formatted_long": "1 جمادی الاول 1431",
    "month_name": "جمادی الاول"
  }
}
```

## Next Steps to Complete Implementation

### Step 1: Install Backend Dependencies
```bash
pip install jdatetime==5.0.0 hijri-converter==2.3.1
```

### Step 2: Run Database Migration
```bash
python manage.py makemigrations account --name add_preferred_calendar
python manage.py migrate
```

### Step 3: Test the Implementation

1. **Start the backend:**
   ```bash
   python manage.py runserver
   ```

2. **Build the frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ./build_frontend.sh
   ```

3. **Test the API:**
   - Create a new student
   - Select date of birth using the Shamsi calendar
   - Verify the response includes both Shamsi and Qamari dates

## Afghanistan Month Names

### Shamsi (Dari):
- حمل (Hamal) - March 21 - April 20
- ثور (Sawr) - April 21 - May 21
- جوزا (Jawza) - May 22 - June 21
- سرطان (Saratan) - June 22 - July 22
- اسد (Asad) - July 23 - August 22
- سنبله (Sonbola) - August 23 - September 22
- میزان (Mizan) - September 23 - October 22
- عقرب (Aqrab) - October 23 - November 21
- قوس (Qaws) - November 22 - December 21
- جدی (Jadi) - December 22 - January 19
- دلو (Dalwa) - January 20 - February 18
- حوت (Hoot) - February 19 - March 20

### Shamsi (Pashto):
- وری (Wray)
- غوی (Ghway)
- غبرګولی (Ghbargolay)
- چنګاښ (Chungash)
- زمری (Zmaray)
- وږی (Wazhay)
- تله (Tala)
- لړم (Laram)
- لیندۍ (Linday)
- مرغومی (Marghumay)
- سلواغه (Salwagha)
- کب (Kab)

### Qamari (Arabic - used in Afghanistan):
- محرم الحرام (Muharram)
- صفر المظفر (Safar)
- ربيع الاول (Rabi al-Awwal)
- ربيع الثاني (Rabi al-Thani)
- جمادی الاول (Jumada al-Awwal)
- جمادی الثاني (Jumada al-Thani)
- رجب المرجب (Rajab)
- شعبان المعظم (Sha'ban)
- رمضان المبارک (Ramadan)
- شوال المکرم (Shawwal)
- ذی القعده (Dhu al-Qi'dah)
- ذی الحجه (Dhu al-Hijjah)

## Applying to Other Models

To apply the same calendar functionality to other date fields:

### Backend:
```python
# In serializers
from api.utils.calendar import get_calendar_info

class YourSerializer(serializers.ModelSerializer):
    date_field_shamsi = serializers.SerializerMethodField()
    date_field_qamari = serializers.SerializerMethodField()
    
    def get_date_field_shamsi(self, obj):
        return get_calendar_info(obj.date_field).get('shamsi')
    
    def get_date_field_qamari(self, obj):
        return get_calendar_info(obj.date_field).get('qamari')
```

### Frontend:
```tsx
import { ShamsiDatePicker } from '@/components/ui/shamsi-datepicker';

<ShamsiDatePicker
  value={formData.date_field}
  onChange={(date) => setFormData({ ...formData, date_field: date })}
  label="Date Field"
  required
/>
```

## Benefits

1. **No Database Migration** - Dates stored in Gregorian (ISO format)
2. **Flexible** - Users can switch between calendar views
3. **Afghanistan-Specific** - Uses Dari and Pashto month names
4. **Dual Calendar Support** - Both Shamsi (Solar) and Qamari (Lunar)
5. **API Ready** - Backend automatically returns all calendar formats
