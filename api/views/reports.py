from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from api.services.financial_report_service import build_financial_summary
from api.utils.calendar import to_gregorian_date_str
from api.permissions import HasCodenamePermission


class FinancialReportView(APIView):
    """Dashboard financial overview from journal entries."""
    permission_classes = [IsAuthenticated, HasCodenamePermission]
    required_permission = 'view_dashboard'

    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        calendar_type = request.query_params.get('calendar_type', 'gregorian')

        start_date = to_gregorian_date_str(start_date, calendar_type)
        end_date = to_gregorian_date_str(end_date, calendar_type)

        data = build_financial_summary(period, start_date, end_date)
        return Response(data, status=status.HTTP_200_OK)
