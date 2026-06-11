# Student Payment Workflow Implementation

## Overview
This document describes the implemented student payment workflow that allows:
1. Selecting students by class level
2. Viewing fee assignments for selected students
3. Creating payments for selected fee assignments and months

## Workflow Implementation

### 1. Select Student by Level

**Endpoint:** `/api/students/by_level/?level=<level_id>`

**Method:** GET

**Description:** Get all active students for a specific class level

**Example Request:**
```
GET /api/students/by_level/?level=1
```

**Response:**
```json
{
  "level": {
    "id": 1,
    "name": "Class 1",
    "level": "1"
  },
  "students": [
    {
      "id": 123,
      "full_name": "Student Name",
      "registration_number": "REG-001",
      "class_level_details": {"name": "Class 1"},
      "financial_summary": {...}
    }
  ],
  "count": 15
}
```

### 2. Get Student Fee Assignments

**Endpoint:** `/api/student-payment-flow/student_fee_assignments/?student=<student_id>&class_level=<level_id>`

**Method:** GET

**Description:** Get all fee assignments for a student, optionally filtered by class level

**Example Request:**
```
GET /api/student-payment-flow/student_fee_assignments/?student=123&class_level=1
```

**Response:**
```json
{
  "student": {
    "id": 123,
    "full_name": "Student Name",
    "registration_number": "REG-001",
    "class_level": "Class 1",
    "total_paid": "5000",
    "remaining_balance": "2000"
  },
  "class_level": "1",
  "total_assignments": [
    {
      "id": 45,
      "fee_type": 1,
      "fee_type_details": {"name": "Tuition Fee", "code": "Tuition"},
      "amount": "3000",
      "currency": "AFN",
      "paid_amount": "1000",
      "remaining_amount": "2000",
      "payment_plan": 1,
      "is_mandatory": true,
      "is_active": true
    }
  ],
  "count": 3
}
```

### 3. Create Payments for Selected Assignments

**Endpoint:** `/api/student-payments/create_payments_for_assignments/`

**Method:** POST

**Description:** Create payments for selected fee assignments and months

**Request Body:**
```json
{
  "student": 123,
  "class_level": "1",
  "assignment_ids": [45, 46],
  "period_year": "2026",
  "period_months": ["01", "02", "03"],
  "amount": "1500",
  "payment_date": "2026-01-15",
  "payment_status": "completed",
  "currency": "AFN"
}
```

**Parameters:**
- `student` (required): Student ID
- `class_level` (optional): Level ID or 'all' for all levels
- `assignment_ids` (required): Array of fee assignment IDs
- `period_year` (optional): Year for payment period (defaults to current year)
- `period_months` (required): Array of month numbers (1-12)
- `amount` (optional): Total payment amount (auto-calculated from remaining if not provided)
- `payment_date` (optional): Payment date (defaults to today)
- `payment_status` (optional): Payment status (defaults to 'completed')
- `currency` (optional): Currency code (defaults to 'AFN')

**Response:**
```json
{
  "success": true,
  "message": "6 payments created successfully",
  "payments": [
    {
      "id": 789,
      "assignment": 45,
      "amount": "250",
      "currency": "AFN",
      "payment_date": "2026-01-15",
      "payment_status": "completed",
      "period_year": "2026",
      "period_month": "01",
      "fee_type": 1
    }
  ],
  "created_count": 6
}
```

## Validation Rules

1. **Assignment Validation:**
   - Assignments must belong to the selected student
   - Assignments must be active
   - Number of selected months must not exceed the assignment's `payment_plan`
   - Payment amount cannot exceed remaining balance

2. **Month Validation:**
   - Months must be between 1-12
   - At least one month must be selected
   - Selected months count must respect `payment_plan` limit per assignment

3. **Amount Validation:**
   - If amount is provided, it cannot exceed total remaining balance across selected assignments
   - If amount is not provided, full remaining balance is paid

## Payment Plan Enforcement

Each `StudentFeeAssignment` has a `payment_plan` field that specifies how many months of payments can be created at once. The system enforces this:

- If `payment_plan = 1` (monthly): Only 1 month can be selected
- If `payment_plan = 3` (quarterly): Up to 3 months can be selected
- If `payment_plan = 12` (yearly): Up to 12 months can be selected

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/students/by_level/` | GET | Get students by class level |
| `/api/student-payment-flow/students_by_level/` | GET | Alternative endpoint for students by level |
| `/api/student-payment-flow/student_fee_assignments/` | GET | Get fee assignments for a student |
| `/api/student-payment-flow/create_payments/` | POST | Create payments (deprecated, use student-payments/create_payments_for_assignments/) |
| `/api/student-payments/create_payments_for_assignments/` | POST | Main endpoint for creating payments |
| `/api/student-payment-flow/level_summary/` | GET | Get summary of all students in a level |

## Model Updates

### StudentFeeAssignment Model
- Added `class_level` field to track which level the assignment targets
- Added `payment_plan` field to define payment frequency (1=monthly, 3=quarterly, etc.)

### StudentPayment Model
- Payments are linked to `StudentFeeAssignment` instead of directly to `Student`
- Each payment is created per assignment per month
- `period_year` and `period_month` fields track the payment period

## Frontend Integration

The frontend pages should use these endpoints:

1. **Student List:** Use `/api/students/by_level/?level=<level_id>` to filter by level
2. **Fee Assignments:** Use `/api/student-payment-flow/student_fee_assignments/?student=<student_id>` to show fees
3. **Payment Creation:** Use `/api/student-payments/create_payments_for_assignments/` to create payments

## Example Frontend Flow

```javascript
// Step 1: Select level and get students
const students = await api.get('/students/by_level/', { params: { level: selectedLevelId } });

// Step 2: Select student and get fee assignments
const assignments = await api.get('/student-payment-flow/student_fee_assignments/', {
  params: { student: selectedStudentId, class_level: selectedLevelId }
});

// Step 3: User selects assignments and months
const paymentData = {
  student: selectedStudentId,
  class_level: selectedLevelId,
  assignment_ids: selectedAssignmentIds,
  period_year: '2026',
  period_months: ['01', '02', '03'],
  amount: '1500'
};

// Step 4: Create payments
const result = await api.post('/student-payments/create_payments_for_assignments/', paymentData);
```

## Testing

### Test Scenario 1: Monthly Payment (payment_plan = 1)
```json
{
  "student": 123,
  "assignment_ids": [45],
  "period_year": "2026",
  "period_months": ["01"],
  "amount": "1000"
}
```
Expected: 1 payment created

### Test Scenario 2: Quarterly Payment (payment_plan = 3)
```json
{
  "student": 123,
  "assignment_ids": [45],
  "period_year": "2026",
  "period_months": ["01", "02", "03"],
  "amount": "3000"
}
```
Expected: 3 payments created (one for each month)

### Test Scenario 3: Multiple Assignments
```json
{
  "student": 123,
  "assignment_ids": [45, 46],
  "period_year": "2026",
  "period_months": ["01"],
  "amount": "1500"
}
```
Expected: 2 payments created (amount split between assignments)

## Future Enhancements

1. Add payment history view per assignment
2. Add notification when payment is overdue
3. Add payment reminder system
4. Add installment tracking
5. Add export functionality for payment reports
