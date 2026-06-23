from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from api.models.data.permissions import Permission, UserPermission
from api.serializers.data.permissions import PermissionSerializer, UserPermissionSerializer, UserPermissionUpdateSerializer
from api.permissions import IsAdmin
from account.models import User


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        module = self.request.query_params.get('module', None)
        if module:
            queryset = queryset.filter(module=module)
        return queryset.order_by('module', 'name')


class UserPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = UserPermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        if user_id:
            return UserPermission.objects.filter(user_id=user_id)
        return UserPermission.objects.all()
    
    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request, user_id=None):
        """Bulk update user permissions"""
        user = get_object_or_404(User, id=user_id)
        serializer = UserPermissionUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            permissions_data = serializer.validated_data['permissions']
            
            for perm_data in permissions_data:
                permission_id = perm_data['permission_id']
                granted = perm_data['granted'].lower() == 'true'
                
                permission = get_object_or_404(Permission, id=permission_id)
                
                user_permission, created = UserPermission.objects.get_or_create(
                    user=user,
                    permission=permission,
                    defaults={'granted': granted}
                )
                
                if not created:
                    user_permission.granted = granted
                    user_permission.save()
            
            # Return updated permissions
            updated_permissions = UserPermission.objects.filter(user=user)
            serializer = UserPermissionSerializer(updated_permissions, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='user-permissions')
    def user_permissions(self, request, user_id=None):
        """Get all permissions for a user with granted status"""
        user = get_object_or_404(User, id=user_id)
        all_permissions = Permission.objects.all()
        user_permissions = UserPermission.objects.filter(user=user)
        
        # Create a dict for quick lookup
        granted_permissions = {up.permission_id: up.granted for up in user_permissions}
        
        result = []
        for permission in all_permissions:
            result.append({
                'id': permission.id,
                'name': permission.name,
                'codename': permission.codename,
                'module': permission.module,
                'description': permission.description,
                'granted': granted_permissions.get(permission.id, False)
            })
        
        return Response(result, status=status.HTTP_200_OK)
