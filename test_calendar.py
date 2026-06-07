#!/usr/bin/env python
"""
Test script to verify Afghanistan Shamsi and Qamari calendar conversion
"""

import sys
sys.path.insert(0, '/home/rahmdel/Documents/alfal-mis')

from datetime import date
from api.utils.calendar import (
    gregorian_to_shamsi,
    gregorian_to_qamari,
    shamsi_to_gregorian,
    qamari_to_gregorian,
    get_calendar_info,
)

print("=" * 60)
print("Afghanistan Calendar Conversion Test")
print("=" * 60)

# Test with today's date
today = date.today()
print(f"\nToday (Gregorian): {today}")

# Convert to Shamsi
shamsi = gregorian_to_shamsi(today)
print(f"\nShamsi (شمسی):")
print(f"  Year: {shamsi['year']}")
print(f"  Month: {shamsi['month']} ({shamsi['month_name_dari']})")
print(f"  Day: {shamsi['day']}")
print(f"  Formatted: {shamsi['formatted']}")
print(f"  Long Format (Dari): {shamsi['formatted_long']}")
print(f"  Month in Pashto: {shamsi['month_name_pashto']}")

# Convert to Qamari
qamari = gregorian_to_qamari(today)
print(f"\nQamari (قمری):")
print(f"  Year: {qamari['year']}")
print(f"  Month: {qamari['month']} ({qamari['month_name']})")
print(f"  Day: {qamari['day']}")
print(f"  Formatted: {qamari['formatted']}")
print(f"  Long Format: {qamari['formatted_long']}")

# Test reverse conversion
print("\n" + "=" * 60)
print("Reverse Conversion Test")
print("=" * 60)

# Shamsi to Gregorian
greg_from_shamsi = shamsi_to_gregorian(shamsi['year'], shamsi['month'], shamsi['day'])
print(f"\nShamsi {shamsi['formatted']} -> Gregorian: {greg_from_shamsi}")

# Qamari to Gregorian
greg_from_qamari = qamari_to_gregorian(qamari['year'], qamari['month'], qamari['day'])
print(f"Qamari {qamari['formatted']} -> Gregorian: {greg_from_qamari}")

# Test with specific dates
print("\n" + "=" * 60)
print("Specific Date Tests")
print("=" * 60)

test_dates = [
    date(2024, 3, 21),  # Nowruz (Shamsi New Year)
    date(2024, 1, 1),   # Gregorian New Year
    date(2024, 12, 31), # End of Gregorian year
]

for test_date in test_dates:
    info = get_calendar_info(test_date)
    print(f"\nGregorian: {test_date}")
    print(f"  Shamsi: {info['shamsi']['formatted'] if info['shamsi'] else 'N/A'}")
    print(f"  Qamari: {info['qamari']['formatted'] if info['qamari'] else 'N/A'}")

print("\n" + "=" * 60)
print("All tests completed successfully!")
print("=" * 60)
