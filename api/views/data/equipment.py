from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models.data.equipment import Equipment, EquipmentCategory, EquipmentStockMovement
from api.permissions import HasAnyCodenamePermission, user_is_admin
from api.serializers.data.equipment import (
    EquipmentCategorySerializer,
    EquipmentSerializer,
    EquipmentStockMovementSerializer,
)
from api.views.data.base import DataRootViewSet


def _validate_category(category):
    if category is None or not (1 <= int(category) <= 5):
        return False
    return True


class EquipmentCategoryViewSet(DataRootViewSet):
    permission_module = 'equipment'
    queryset = EquipmentCategory.objects.all().order_by('name')
    serializer_class = EquipmentCategorySerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']


class EquipmentViewSet(DataRootViewSet):
    permission_module = 'equipment'
    action_permissions = {
        'movements': 'view_equipment',
        'summary': 'view_equipment',
    }
    queryset = Equipment.objects.select_related('category').all().order_by('-id')
    serializer_class = EquipmentSerializer
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'barcode', 'brand', 'model', 'description']

    def get_permissions(self):
        if self.action in ('transfer_stock', 'add_stock'):
            self.any_required_permissions = ['edit_equipment', 'transfer_equipment_stock']
            return [IsAuthenticated(), HasAnyCodenamePermission()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()
        stock_level = self.request.query_params.get('stock_level')
        if stock_level:
            try:
                level = int(stock_level)
                if 1 <= level <= 5:
                    queryset = queryset.filter(**{f'stock_category_{level}__gt': 0})
            except (TypeError, ValueError):
                pass
        return queryset

    def _user_can_move_stock(self, user):
        if user_is_admin(user):
            return True
        return user.has_permission('edit_equipment') or user.has_permission('transfer_equipment_stock')

    @action(detail=True, methods=['post'])
    def transfer_stock(self, request, pk=None):
        """Move quantity between stock categories. Category 5 = out of warehouse."""
        if not self._user_can_move_stock(request.user):
            return Response({'error': 'You do not have permission to move equipment stock.'}, status=403)
        equipment = self.get_object()
        from_category = request.data.get('from_category')
        to_category = request.data.get('to_category')
        quantity = request.data.get('quantity')
        notes = request.data.get('notes', '')

        try:
            from_category = int(from_category)
            to_category = int(to_category)
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({'error': 'from_category, to_category, and quantity are required integers'}, status=400)

        if not _validate_category(from_category) or not _validate_category(to_category):
            return Response({'error': 'Categories must be between 1 and 5'}, status=400)
        if from_category == to_category:
            return Response({'error': 'Source and destination categories must be different'}, status=400)
        if quantity <= 0:
            return Response({'error': 'Quantity must be greater than zero'}, status=400)
        if from_category == 5:
            return Response({'error': 'Cannot transfer from category 5 (already out of warehouse)'}, status=400)
        if to_category != 5 and from_category == 5:
            return Response({'error': 'Invalid transfer from category 5'}, status=400)

        available = equipment.get_stock_for_category(from_category)
        if quantity > available:
            return Response(
                {'error': f'Not enough stock in category {from_category}. Available: {available}'},
                status=400,
            )

        with transaction.atomic():
            equipment.set_stock_for_category(from_category, available - quantity)
            if to_category == 5:
                equipment.set_stock_for_category(5, equipment.stock_category_5 + quantity)
            else:
                current_dest = equipment.get_stock_for_category(to_category)
                equipment.set_stock_for_category(to_category, current_dest + quantity)
            equipment.save()

            movement = EquipmentStockMovement.objects.create(
                equipment=equipment,
                from_category=from_category,
                to_category=to_category,
                quantity=quantity,
                notes=notes,
                moved_by=request.user,
            )

        serializer = EquipmentSerializer(equipment, context={'request': request})
        return Response({
            'equipment': serializer.data,
            'movement': EquipmentStockMovementSerializer(movement).data,
        })

    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        """Add new items into warehouse (default: category 1)."""
        if not self._user_can_move_stock(request.user):
            return Response({'error': 'You do not have permission to move equipment stock.'}, status=403)
        equipment = self.get_object()
        quantity = request.data.get('quantity')
        target_category = request.data.get('target_category', 1)
        notes = request.data.get('notes', '')

        try:
            quantity = int(quantity)
            target_category = int(target_category)
        except (TypeError, ValueError):
            return Response({'error': 'quantity and target_category must be integers'}, status=400)

        if quantity <= 0:
            return Response({'error': 'Quantity must be greater than zero'}, status=400)
        if target_category < 1 or target_category > 4:
            return Response({'error': 'target_category must be between 1 and 4'}, status=400)

        with transaction.atomic():
            current = equipment.get_stock_for_category(target_category)
            equipment.set_stock_for_category(target_category, current + quantity)
            equipment.save()

            movement = EquipmentStockMovement.objects.create(
                equipment=equipment,
                from_category=None,
                to_category=target_category,
                quantity=quantity,
                notes=notes or 'Added to warehouse',
                moved_by=request.user,
            )

        serializer = EquipmentSerializer(equipment, context={'request': request})
        return Response({
            'equipment': serializer.data,
            'movement': EquipmentStockMovementSerializer(movement).data,
        })

    @action(detail=True, methods=['get'])
    def movements(self, request, pk=None):
        equipment = self.get_object()
        movements = equipment.stock_movements.filter(is_deleted=False).order_by('-created_at')
        serializer = EquipmentStockMovementSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        items = self.filter_queryset(self.get_queryset())
        total_items = items.count()
        warehouse_total = 0
        out_total = 0
        reference_value = Decimal('0')
        category_item_counts = {}
        for level in range(1, 6):
            category_item_counts[str(level)] = items.filter(
                **{f'stock_category_{level}__gt': 0}
            ).count()
        for item in items:
            warehouse_total += item.warehouse_quantity
            out_total += item.stock_category_5
            reference_value += item.warehouse_quantity * (item.unit_price or Decimal('0'))
        return Response({
            'total_equipment_types': total_items,
            'warehouse_quantity': warehouse_total,
            'out_of_warehouse_quantity': out_total,
            'warehouse_reference_value': str(reference_value.quantize(Decimal('1'))),
            'category_item_counts': category_item_counts,
        })
