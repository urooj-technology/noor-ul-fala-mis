import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Package, Boxes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable, { TableColumn, TableAction } from '@/components/ui/data-table';
import { PermissionButton } from '@/components/ui/permission-button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/contexts/PermissionContext';
import useFetchObjects from '@/api/useFetchObjects';
import useDelete from '@/api/useDelete';

const STOCK_LEVELS = ['1', '2', '3', '4', '5'] as const;
type StockLevel = typeof STOCK_LEVELS[number];

const formatMoney = (value: string | number | undefined) => {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : (value ?? 0);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

const getStockQty = (record: Record<string, number>, level: StockLevel) =>
  record[`stock_category_${level}`] ?? 0;

export const EquipmentList = () => {
  const { t } = useLanguage();
  const { canEdit, canDelete } = usePermissions();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockLevelTab, setStockLevelTab] = useState<StockLevel>('1');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: summary } = useFetchObjects<{
    total_equipment_types: number;
    warehouse_quantity: number;
    out_of_warehouse_quantity: number;
    warehouse_reference_value: string;
    category_item_counts?: Record<string, number>;
  }>({
    queryKey: ['equipment-summary'],
    endpoint: 'equipment/summary/',
  });

  const { data: categoriesData } = useFetchObjects<{ results: { id: number; name: string }[] }>({
    queryKey: ['equipment-categories-all'],
    endpoint: 'equipment-categories/',
    params: { page_size: 200 },
  });

  const { data: equipmentData, isLoading } = useFetchObjects<{
    results: any[];
    count: number;
  }>({
    queryKey: ['equipment', currentPage.toString(), pageSize.toString(), searchTerm, categoryFilter, stockLevelTab],
    endpoint: 'equipment/',
    params: {
      page: currentPage,
      page_size: pageSize,
      search: searchTerm,
      stock_level: stockLevelTab,
      ...(categoryFilter && { category: categoryFilter }),
    },
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: 'equipment',
    endpoint: 'equipment',
  });

  const equipment = equipmentData?.results || [];
  const totalItems = equipmentData?.count || 0;
  const categories = categoriesData?.results || [];

  const columns: TableColumn[] = [
    {
      key: 'barcode',
      title: t('equipment.barcode'),
      render: (value) => <span className="font-mono text-xs font-semibold">{value}</span>,
    },
    {
      key: 'name',
      title: t('equipment.name'),
      render: (value, record) => (
        <div>
          <span className="text-xs font-medium block">{value}</span>
          {record.brand && <span className="text-[10px] text-muted-foreground">{record.brand}{record.model ? ` · ${record.model}` : ''}</span>}
        </div>
      ),
    },
    {
      key: 'category_details',
      title: t('equipment.equipmentTypeCategory'),
      render: (value) => <span className="text-xs">{value?.name || '-'}</span>,
    },
    {
      key: 'unit_price',
      title: t('equipment.referencePrice'),
      render: (value) => <span className="text-xs">{formatMoney(value)} AFN</span>,
    },
    {
      key: 'category_quantity',
      title: t(`equipment.stockCategory${stockLevelTab}`),
      render: (_, record) => {
        const qty = getStockQty(record, stockLevelTab);
        return (
          <Badge className={stockLevelTab === '5' ? 'bg-muted text-foreground' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}>
            {qty}
          </Badge>
        );
      },
    },
    {
      key: 'warehouse_quantity',
      title: t('equipment.warehouseQuantity'),
      render: (value) => <span className="text-xs">{value ?? 0}</span>,
    },
    {
      key: 'is_active',
      title: t('equipment.isActive'),
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('common.yes', 'Yes') : t('common.no', 'No')}
        </Badge>
      ),
    },
  ];

  const rowActions: TableAction[] = [
    {
      key: 'view',
      label: t('common.view', 'View'),
      icon: <Eye className="h-4 w-4" />,
      onClick: (record) => navigate(`/equipment/${record.id}`, { state: { stockLevel: stockLevelTab } }),
    },
    ...(canEdit('equipment') ? [{
      key: 'edit',
      label: t('common.edit', 'Edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: (record: { id: number }) => navigate(`/equipment/${record.id}/edit`),
    }] : []),
    ...(canDelete('equipment') ? [{
      key: 'delete',
      label: t('common.delete', 'Delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (record: { id: number; name: string }) => handleDelete(record.id, record.name),
      variant: 'ghost' as const,
      className: 'text-red-600 hover:text-red-700',
    }] : []),
  ];

  return (
    <div className="space-y-6 p-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('equipment.summaryTotalTypes'), value: summary.total_equipment_types, icon: Package },
            { label: t('equipment.summaryInWarehouse'), value: summary.warehouse_quantity, icon: Boxes },
            { label: t('equipment.summaryOut'), value: summary.out_of_warehouse_quantity, icon: Package },
            { label: t('equipment.summaryValue'), value: `${formatMoney(summary.warehouse_reference_value)} AFN`, icon: Package },
          ].map((item) => (
            <div key={item.label} className="border rounded-lg p-3 bg-card">
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs
        value={stockLevelTab}
        onValueChange={(value) => {
          setStockLevelTab(value as StockLevel);
          setCurrentPage(1);
        }}
      >
        <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 w-full justify-start">
          {STOCK_LEVELS.map((level) => {
            const count = summary?.category_item_counts?.[level];
            return (
              <TabsTrigger
                key={level}
                value={level}
                className="text-xs sm:text-sm px-3 py-2 data-[state=active]:shadow-sm"
              >
                {t(`equipment.stockCategory${level}`)}
                {count !== undefined && (
                  <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <DataTable
        data={equipment}
        columns={columns}
        loading={isLoading}
        title={t('equipment.equipmentWarehouse')}
        subtitle={t('equipment.manageEquipmentByCategory').replace(
          '{{category}}',
          t(`equipment.stockCategory${stockLevelTab}`),
        )}
        icon={<Package className="h-5 w-5" />}
        headerActions={
          <PermissionButton module="equipment" action="create" onClick={() => navigate('/equipment/add')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('equipment.addEquipment')}
          </PermissionButton>
        }
        searchable
        searchPlaceholder={t('equipment.searchEquipment')}
        searchValue={searchTerm}
        onSearch={(v) => { setSearchTerm(v); setCurrentPage(1); }}
        customFilters={[{
          key: 'category',
          label: t('equipment.equipmentTypeCategory'),
          component: (
            <Autocomplete
              options={categories}
              value={categoryFilter}
              onChange={(v) => { setCategoryFilter(v as string); setCurrentPage(1); }}
              placeholder={t('equipment.selectCategory')}
              getOptionLabel={(c) => c.name}
              getOptionValue={(c) => c.id.toString()}
            />
          ),
        }]}
        showClearFilters={!!categoryFilter || !!searchTerm}
        clearFiltersLabel={t('common.clear', 'Clear')}
        onClearFilters={() => { setCategoryFilter(''); setSearchTerm(''); setCurrentPage(1); }}
        rowActions={rowActions}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalItems,
          onPageChange: setCurrentPage,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(1); },
        }}
        emptyIcon={<Package className="h-8 w-8 text-muted-foreground" />}
        emptyTitle={t('equipment.noEquipmentInCategory')}
        emptyDescription={t('equipment.addFirstEquipment')}
        loadingText={t('equipment.loadingEquipment')}
        maxHeight="75vh"
        stickyHeader
      />
      <ConfirmDialog />
    </div>
  );
};

export default EquipmentList;
