from rest_framework.decorators import action
from rest_framework.response import Response
from api.models.data.employee import Employee
from api.serializers.data.employee import EmployeeSerializer
from api.views.data.base import DataRootViewSet
from datetime import datetime

class EmployeeViewSet(DataRootViewSet):
    permission_module = 'employees'
    action_permissions = {
        'financial_summary': 'view_employees',
    }
    queryset = Employee.objects.all().order_by("-id")
    serializer_class = EmployeeSerializer
    filterset_fields = ["is_active", "position"]
    search_fields = ["full_name", "phone", "position"]

    def _month_to_int(self, month):
        if isinstance(month, int):
            return month
        if isinstance(month, str):
            if month.isdigit():
                return int(month)
            month_names = ['january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december']
            try:
                return month_names.index(month.lower()) + 1
            except ValueError:
                pass
        return 1

    def _get_period_params(self, request):
        """Parse month/year from query params with Shamsi-friendly defaults."""
        now = datetime.now()
        month = request.query_params.get('month')
        year = request.query_params.get('year')

        month_int = self._month_to_int(month) if month else now.month
        year_int = int(year) if year else now.year
        return month_int, year_int

    def _attach_financial_summaries(self, data, month_int, year_int):
        for item in data:
            employee = Employee.objects.get(id=item['id'])
            item['financial_summary'] = employee.get_period_financial_summary(month_int, year_int)
        return data

    def list(self, request, *args, **kwargs):
        """Override list to add month/year financial summary per employee."""
        month_int, year_int = self._get_period_params(request)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = self._attach_financial_summaries(serializer.data, month_int, year_int)
            return self.get_paginated_response(data)

        serializer = self.get_serializer(queryset, many=True)
        data = self._attach_financial_summaries(serializer.data, month_int, year_int)
        return Response(data)

    @action(detail=True, methods=['get'])
    def financial_summary(self, request, pk=None):
        employee = self.get_object()
        month_int, year_int = self._get_period_params(request)
        calendar_type = request.query_params.get('calendar_type', 'shamsi')

        summary = employee.get_period_financial_summary(month_int, year_int)
        summary.update({
            'id': employee.id,
            'full_name': employee.full_name,
            'calendar_type': calendar_type,
        })
        return Response(summary)
