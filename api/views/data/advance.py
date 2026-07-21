from rest_framework.response import Response
from api.models.data.advance import Advance
from api.serializers.data.advance import AdvanceSerializer
from api.views.data.base import DataRootViewSet
from api.utils.registration_dates import get_registration_date_range


class AdvanceViewSet(DataRootViewSet):
    permission_module = 'advances'
    queryset = Advance.objects.select_related('employee').all().order_by('-payment_date', '-id')
    serializer_class = AdvanceSerializer
    filterset_fields = ["employee", "year", "month"]
    search_fields = ["employee__full_name", "employee__position", "reason"]

    def get_queryset(self):
        queryset = super().get_queryset()
        position = self.request.query_params.get('position')
        if position:
            queryset = queryset.filter(employee__position=position)
        date_period = self.request.query_params.get('date_period')
        if date_period:
            date_from = self.request.query_params.get('date_from')
            date_to = self.request.query_params.get('date_to')
            range_start, range_end = get_registration_date_range(
                date_period, date_from, date_to
            )
            if range_start and range_end:
                queryset = queryset.filter(
                    payment_date__gte=range_start,
                    payment_date__lte=range_end,
                )
            elif date_period == 'custom':
                queryset = queryset.none()
        return queryset

    def list(self, request, *args, **kwargs):
        if request.query_params.get('date_period'):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'count': queryset.count(),
                'results': serializer.data,
            })
        return super().list(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Create advance - journal entry created automatically by signal"""
        serializer.save()