from decimal import Decimal

from rest_framework import serializers

from api.models.data.equipment import Equipment, EquipmentCategory, EquipmentStockMovement
from api.serializers.data.base import DataRootSerializer


class EquipmentCategorySerializer(DataRootSerializer):
    equipment_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EquipmentCategory
        fields = '__all__'

    def get_equipment_count(self, obj):
        return obj.equipment_items.filter(is_deleted=False).count()


class EquipmentStockMovementSerializer(DataRootSerializer):
    moved_by_name = serializers.SerializerMethodField(read_only=True)
    from_category_label = serializers.SerializerMethodField(read_only=True)
    to_category_label = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EquipmentStockMovement
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'moved_by']

    def get_moved_by_name(self, obj):
        if not obj.moved_by:
            return None
        user = obj.moved_by
        name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        return name or user.username or user.email

    def get_from_category_label(self, obj):
        return _category_label(obj.from_category)

    def get_to_category_label(self, obj):
        return _category_label(obj.to_category)


def _category_label(category):
    if category is None:
        return 'new'
    if category == 5:
        return 'out'
    return f'category_{category}'


class EquipmentSerializer(DataRootSerializer):
    category_details = serializers.SerializerMethodField(read_only=True)
    warehouse_quantity = serializers.IntegerField(read_only=True)
    total_out_quantity = serializers.IntegerField(source='stock_category_5', read_only=True)
    warehouse_value = serializers.SerializerMethodField(read_only=True)
    initial_quantity = serializers.IntegerField(
        write_only=True,
        required=False,
        min_value=0,
        default=0,
    )
    initial_stock_category = serializers.IntegerField(
        write_only=True,
        required=False,
        min_value=1,
        max_value=4,
        default=1,
    )

    class Meta:
        model = Equipment
        fields = [
            'id',
            'category',
            'category_details',
            'name',
            'barcode',
            'unit_price',
            'brand',
            'model',
            'description',
            'is_active',
            'stock_category_1',
            'stock_category_2',
            'stock_category_3',
            'stock_category_4',
            'stock_category_5',
            'warehouse_quantity',
            'total_out_quantity',
            'warehouse_value',
            'initial_quantity',
            'initial_stock_category',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'stock_category_1',
            'stock_category_2',
            'stock_category_3',
            'stock_category_4',
            'stock_category_5',
            'created_at',
            'updated_at',
        ]

    def get_category_details(self, obj):
        if not obj.category_id:
            return None
        return {'id': obj.category_id, 'name': obj.category.name}

    def get_warehouse_value(self, obj):
        return str((obj.warehouse_quantity * (obj.unit_price or Decimal('0'))).quantize(Decimal('1')))

    def create(self, validated_data):
        initial_quantity = validated_data.pop('initial_quantity', 0) or 0
        initial_stock_category = validated_data.pop('initial_stock_category', 1) or 1
        if initial_stock_category < 1 or initial_stock_category > 4:
            initial_stock_category = 1
        equipment = super().create(validated_data)
        if initial_quantity > 0:
            equipment.set_stock_for_category(initial_stock_category, initial_quantity)
            equipment.save()
            request = self.context.get('request')
            EquipmentStockMovement.objects.create(
                equipment=equipment,
                from_category=None,
                to_category=initial_stock_category,
                quantity=initial_quantity,
                notes='Initial warehouse stock',
                moved_by=request.user if request and request.user.is_authenticated else None,
            )
        return equipment
