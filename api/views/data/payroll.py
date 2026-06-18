from api.models.data.payroll import Payroll
from api.serializers.data.payroll import PayrollSerializer
from api.views.data.base import DataRootViewSet

class PayrollViewSet(DataRootViewSet):
    queryset = Payroll.objects.all().order_by("-id")
    serializer_class = PayrollSerializer
    filterset_fields = ["employee", "year", "month"]
    search_fields = ["employee__full_name", "employee__position"]
    
    def perform_create(self, serializer):
        """Create payroll - journal entry created automatically by signal"""
        serializer.save()