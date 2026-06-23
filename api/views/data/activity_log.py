from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from api.models.data.activity_log import ActivityLog
from api.serializers.data.activity_log import ActivityLogSerializer
from api.views.data.base import DataRootViewSet


class ActivityLogViewSet(DataRootViewSet):
    permission_module = 'activity_logs'
    queryset = ActivityLog.objects.select_related('user').all()
    serializer_class = ActivityLogSerializer
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['description', 'user__username', 'user__first_name', 'user__last_name', 'user__email', 'model_name']
    ordering_fields = ['created_at', 'action', 'model_name']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get activity statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_activities': queryset.count(),
            'by_action': list(queryset.values('action').annotate(count=Count('id'))),
            'by_user': list(queryset.values('user__username', 'user__first_name', 'user__last_name', 'user__role').annotate(count=Count('id'))[:10]),
            'by_model': list(queryset.values('model_name').annotate(count=Count('id'))),
        }
        
        return Response(stats)
