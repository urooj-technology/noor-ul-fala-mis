from api.models.data.advance import Advance
from api.serializers.data.advance import AdvanceSerializer
from api.views.data.base import DataRootViewSet

class AdvanceViewSet(DataRootViewSet):
    permission_module = 'advances'
    queryset = Advance.objects.all().order_by("-id")
    serializer_class = AdvanceSerializer
    filterset_fields = ["employee", "year", "month"]
    search_fields = ["employee__full_name", "employee__position", "reason"]
    
    def perform_create(self, serializer):
        """Create advance - journal entry created automatically by signal"""
        serializer.save()