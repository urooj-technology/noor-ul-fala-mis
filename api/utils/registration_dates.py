from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date


def get_registration_date_range(period, date_from=None, date_to=None):
    """Return (start_date, end_date) for a registration period filter."""
    today = timezone.localdate()

    if period == 'daily':
        return today, today
    if period == 'weekly':
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    if period == 'monthly':
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(day=31)
        else:
            end = (start.replace(month=start.month + 1) - timedelta(days=1))
        return start, end
    if period == 'yearly':
        return today.replace(month=1, day=1), today.replace(month=12, day=31)
    if period == 'custom':
        start = parse_date(date_from) if date_from else None
        end = parse_date(date_to) if date_to else None
        if start and end and start > end:
            start, end = end, start
        return start, end
    return None, None
