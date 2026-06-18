from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.services.financial_report_service import build_financial_summary


class FinancialReportView(APIView):
    """Dashboard financial overview from journal entries."""

    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        data = build_financial_summary(period, start_date, end_date)
        return Response(data, status=status.HTTP_200_OK)
