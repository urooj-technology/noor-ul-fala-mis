from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from api.views.data.pagination import CustomPagination
from api.permissions import HasModelPermission


class DataRootViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasModelPermission]
    permission_module = None
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, SearchFilter]

    def get_required_permission(self):
        """Return permission codename for the current action, or None to allow."""
        module = self.permission_module
        if not module:
            return None
        prefix = HasModelPermission.ACTION_PREFIX.get(self.action)
        if not prefix:
            return None
        return f'{prefix}_{module}'

    def get_queryset(self):
        """Return active records only for soft-deletable models."""
        queryset = super().get_queryset()
        if hasattr(queryset.model, 'is_deleted'):
            queryset = queryset.filter(is_deleted=False)
        return queryset

    def perform_destroy(self, instance):
        """Soft-delete business records so accounting reversals can run."""
        if hasattr(instance, 'soft_delete'):
            instance.soft_delete(user=self.request.user)
        else:
            instance.delete()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)