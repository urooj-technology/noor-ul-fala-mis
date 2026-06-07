"""
Calendar conversion utilities for Afghanistan
Supports: Gregorian, Shamsi (Jalali/Persian Solar), Qamari (Hijri Lunar)

Note: Afghanistan uses the same Shamsi calendar as Iran (Jalali),
with Dari month names instead of Persian.
"""
import jdatetime
from hijri_converter import Gregorian
from datetime import date


# Afghanistan Dari month names for Shamsi calendar
SHAMSI_MONTHS_DARI = [
    'حمل',      # Aries - March 21 - April 20
    'ثور',      # Taurus - April 21 - May 21
    'جوزا',     # Gemini - May 22 - June 21
    'سرطان',    # Cancer - June 22 - July 22
    'اسد',      # Leo - July 23 - August 22
    'سنبله',    # Virgo - August 23 - September 22
    'میزان',    # Libra - September 23 - October 22
    'عقرب',     # Scorpio - October 23 - November 21
    'قوس',      # Sagittarius - November 22 - December 21
    'جدی',      # Capricorn - December 22 - January 19
    'دلو',      # Aquarius - January 20 - February 18
    'حوت',      # Pisces - February 19 - March 20
]

# Afghanistan Pashto month names for Shamsi calendar
SHAMSI_MONTHS_PASHTO = [
    'وری',      # Wray
    'غوی',      # Ghway
    'غبرګولی',  # Ghbargolay
    'چنګاښ',    # Chungash
    'زمری',     # Zmaray
    'وږی',      # Wazhay
    'تله',      # Tala
    'لړم',      # Laram
    'لیندۍ',    # Linday
    'مرغومی',   # Marghumay
    'سلواغه',   # Salwagha
    'کب',       # Kab
]

# Hijri Qamari month names (Arabic - same for Dari/Pashto)
QAMARI_MONTHS = [
    'محرم الحرام',
    'صفر المظفر',
    'ربيع الاول',
    'ربيع الثاني',
    'جمادی الاول',
    'جمادی الثاني',
    'رجب المرجب',
    'شعبان المعظم',
    'رمضان المبارک',
    'شوال المکرم',
    'ذی القعده',
    'ذی الحجه',
]


def gregorian_to_shamsi(gregorian_date):
    """
    Convert Gregorian date to Afghanistan Shamsi (Jalali)
    
    Args:
        gregorian_date: date object or string (YYYY-MM-DD)
    
    Returns:
        dict with year, month, day, formatted date, and month name
    """
    if not gregorian_date:
        return None
    
    # Handle string input
    if isinstance(gregorian_date, str):
        try:
            year, month, day = map(int, gregorian_date.split('-'))
            gregorian_date = date(year, month, day)
        except (ValueError, AttributeError):
            return None
    
    try:
        j_date = jdatetime.date.fromgregorian(date=gregorian_date)
        month_index = j_date.month - 1
        
        return {
            'year': j_date.year,
            'month': j_date.month,
            'day': j_date.day,
            'formatted': f"{j_date.year}/{j_date.month:02d}/{j_date.day:02d}",
            'formatted_long': f"{j_date.day} {SHAMSI_MONTHS_DARI[month_index]} {j_date.year}",
            'month_name_dari': SHAMSI_MONTHS_DARI[month_index],
            'month_name_pashto': SHAMSI_MONTHS_PASHTO[month_index],
        }
    except Exception:
        return None


def gregorian_to_qamari(gregorian_date):
    """
    Convert Gregorian date to Hijri Qamari (Lunar)
    
    Args:
        gregorian_date: date object or string (YYYY-MM-DD)
    
    Returns:
        dict with year, month, day, formatted date, and month name
    """
    if not gregorian_date:
        return None
    
    # Handle string input
    if isinstance(gregorian_date, str):
        try:
            year, month, day = map(int, gregorian_date.split('-'))
        except (ValueError, AttributeError):
            return None
    else:
        year = gregorian_date.year
        month = gregorian_date.month
        day = gregorian_date.day
    
    try:
        h_date = Gregorian(year, month, day).to_hijri()
        month_index = h_date.month - 1
        
        return {
            'year': h_date.year,
            'month': h_date.month,
            'day': h_date.day,
            'formatted': f"{h_date.year}/{h_date.month:02d}/{h_date.day:02d}",
            'formatted_long': f"{h_date.day} {QAMARI_MONTHS[month_index]} {h_date.year}",
            'month_name': QAMARI_MONTHS[month_index],
        }
    except Exception:
        return None


def shamsi_to_gregorian(year, month, day):
    """
    Convert Afghanistan Shamsi (Jalali) to Gregorian
    
    Args:
        year: Shamsi year (e.g., 1403)
        month: Shamsi month (1-12)
        day: Shamsi day (1-31)
    
    Returns:
        date object or None
    """
    try:
        j_date = jdatetime.date(year, month, day)
        return j_date.togregorian()
    except Exception:
        return None


def qamari_to_gregorian(year, month, day):
    """
    Convert Hijri Qamari to Gregorian
    
    Args:
        year: Hijri year (e.g., 1446)
        month: Hijri month (1-12)
        day: Hijri day (1-30)
    
    Returns:
        date object or None
    """
    try:
        from hijri_converter import Hijri
        g_date = Hijri(year, month, day).to_gregorian()
        return date(g_date.year, g_date.month, g_date.day)
    except Exception:
        return None


def get_calendar_info(gregorian_date, language='fa'):
    """
    Get complete calendar information for a date
    
    Args:
        gregorian_date: date object or string (YYYY-MM-DD)
        language: 'fa' for Dari, 'ps' for Pashto, 'en' for English
    
    Returns:
        dict with Gregorian, Shamsi, and Qamari dates
    """
    shamsi = gregorian_to_shamsi(gregorian_date)
    qamari = gregorian_to_qamari(gregorian_date)
    
    # Handle string input for gregorian
    if isinstance(gregorian_date, str):
        try:
            year, month, day = map(int, gregorian_date.split('-'))
            gregorian_date = date(year, month, day)
        except (ValueError, AttributeError):
            gregorian_date = None
    
    result = {
        'gregorian': None,
        'shamsi': shamsi,
        'qamari': qamari,
    }
    
    if gregorian_date:
        result['gregorian'] = {
            'year': gregorian_date.year,
            'month': gregorian_date.month,
            'day': gregorian_date.day,
            'formatted': gregorian_date.strftime('%Y-%m-%d'),
        }
    
    return result


def parse_shamsi_date(shamsi_str):
    """
    Parse Shamsi date string (YYYY/MM/DD or YYYY-MM-DD)
    
    Args:
        shamsi_str: Shamsi date string
    
    Returns:
        tuple (year, month, day) or None
    """
    try:
        separator = '/' if '/' in shamsi_str else '-'
        parts = shamsi_str.split(separator)
        if len(parts) == 3:
            return tuple(map(int, parts))
    except Exception:
        pass
    return None


def parse_qamari_date(qamari_str):
    """
    Parse Qamari date string (YYYY/MM/DD or YYYY-MM-DD)
    
    Args:
        qamari_str: Qamari date string
    
    Returns:
        tuple (year, month, day) or None
    """
    try:
        separator = '/' if '/' in qamari_str else '-'
        parts = qamari_str.split(separator)
        if len(parts) == 3:
            return tuple(map(int, parts))
    except Exception:
        pass
    return None
