import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { ArrowLeft, Package, ArrowRightLeft } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';
import useFetchObjects from '@/api/useFetchObjects';
import useAdd from '@/api/useAdd';

const NEW_STOCK_VALUE = 'new';

const getStockQty = (equipment: Record<string, number>, level: number | string) =>
  equipment[`stock_category_${level}`] ?? 0;

const resolveDefaultFromCategory = (
  equipment: Record<string, number>,
  preferredLevel?: string,
) => {
  if (
    preferredLevel
    && preferredLevel !== NEW_STOCK_VALUE
    && getStockQty(equipment, preferredLevel) > 0
  ) {
    return preferredLevel;
  }
  for (let level = 1; level <= 4; level += 1) {
    if (getStockQty(equipment, level) > 0) {
      return String(level);
    }
  }
  return NEW_STOCK_VALUE;
};

const resolveDefaultToCategory = (fromCategory: string) => {
  if (fromCategory === NEW_STOCK_VALUE) return '1';
  const fromNum = parseInt(fromCategory, 10);
  if (fromNum >= 1 && fromNum < 4) return String(fromNum + 1);
  return '5';
};

const buildMovementForm = (
  equipment: Record<string, number>,
  preferredLevel?: string,
) => {
  const from_category = resolveDefaultFromCategory(equipment, preferredLevel);
  return {
    from_category,
    to_category: resolveDefaultToCategory(from_category),
    quantity: '1',
    notes: '',
  };
};

const stockCategoryOptions = (t: (key: string) => string) => [
  { value: '1', label: t('equipment.stockCategory1') },
  { value: '2', label: t('equipment.stockCategory2') },
  { value: '3', label: t('equipment.stockCategory3') },
  { value: '4', label: t('equipment.stockCategory4') },
  { value: '5', label: t('equipment.stockCategory5') },
];

const formatMoney = (value: string | number | undefined) => {
  const num = typeof value === 'string' ? parseFloat(value) || 0 : (value ?? 0);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

const EquipmentDetails = () => {
  const { t } = useLanguage();
  const { canEdit, hasAnyPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const preferredStockLevel = (location.state as { stockLevel?: string } | null)?.stockLevel;
  const formInitializedRef = useRef(false);
  const [movementForm, setMovementForm] = useState({
    from_category: NEW_STOCK_VALUE,
    to_category: '1',
    quantity: '1',
    notes: '',
  });

  const canMoveStock = hasAnyPermission(['edit_equipment', 'transfer_equipment_stock']);

  const { data: equipment, refetch } = useFetchObject({
    queryKey: ['equipment', id],
    endpoint: `equipment/${id}/`,
  });

  const { data: movements, refetch: refetchMovements } = useFetchObjects<any[]>({
    queryKey: ['equipment-movements', id],
    endpoint: `equipment/${id}/movements/`,
  });

  const { handleAdd: handleTransfer, loading: transferLoading, isSuccess: transferSuccess } = useAdd({
    queryKey: 'equipment',
    endpoint: `equipment/${id}/transfer_stock/`,
    customSuccessMessage: t('equipment.stockMoved'),
  });

  const { handleAdd: handleAddStock, loading: addLoading, isSuccess: addSuccess } = useAdd({
    queryKey: 'equipment',
    endpoint: `equipment/${id}/add_stock/`,
    customSuccessMessage: t('equipment.stockMoved'),
  });

  useEffect(() => {
    formInitializedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!equipment) return;

    if (!formInitializedRef.current) {
      setMovementForm(buildMovementForm(equipment, preferredStockLevel));
      formInitializedRef.current = true;
      return;
    }

    if (transferSuccess || addSuccess) {
      setMovementForm(buildMovementForm(equipment));
    }
  }, [
    equipment,
    preferredStockLevel,
    transferSuccess,
    addSuccess,
  ]);

  useEffect(() => {
    if (transferSuccess || addSuccess) {
      refetch();
      refetchMovements();
    }
  }, [transferSuccess, addSuccess, refetch, refetchMovements]);

  const cats = stockCategoryOptions(t);
  const fromOptions = [
    { value: NEW_STOCK_VALUE, label: t('equipment.newStockEntry') },
    ...cats.filter((c) => c.value !== '5' && (!equipment || getStockQty(equipment, c.value) > 0)),
  ];
  const toOptions = movementForm.from_category === NEW_STOCK_VALUE
    ? cats.filter((c) => c.value !== '5')
    : cats.filter((c) => c.value !== movementForm.from_category);

  const movementList = Array.isArray(movements) ? movements : [];
  const submitting = transferLoading || addLoading;

  const stockLevels = equipment ? [
    { key: 1, qty: equipment.stock_category_1 },
    { key: 2, qty: equipment.stock_category_2 },
    { key: 3, qty: equipment.stock_category_3 },
    { key: 4, qty: equipment.stock_category_4 },
    { key: 5, qty: equipment.stock_category_5, out: true },
  ] : [];

  const handleMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const quantity = Number(movementForm.quantity);
    if (!quantity || quantity <= 0) return;

    if (movementForm.from_category === NEW_STOCK_VALUE) {
      handleAddStock({
        quantity,
        target_category: Number(movementForm.to_category),
        notes: movementForm.notes,
      });
    } else {
      handleTransfer({
        from_category: Number(movementForm.from_category),
        to_category: Number(movementForm.to_category),
        quantity,
        notes: movementForm.notes,
      });
    }
  };

  if (!equipment) {
    return <div className="container mx-auto py-6 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/equipment')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{equipment.name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{equipment.barcode}</p>
          </div>
        </div>
        {canEdit('equipment') && (
          <Button variant="outline" onClick={() => navigate(`/equipment/${id}/edit`)}>{t('common.edit')}</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{t('equipment.warehouseQuantity')}</p><p className="text-2xl font-bold text-green-600">{equipment.warehouse_quantity}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{t('equipment.totalOut')}</p><p className="text-2xl font-bold">{equipment.stock_category_5}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{t('equipment.warehouseValue')}</p><p className="text-2xl font-bold">{formatMoney(equipment.warehouse_value)} AFN</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />{t('equipment.equipmentInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">{t('equipment.equipmentTypeCategory')}:</span> {equipment.category_details?.name}</div>
          <div><span className="text-muted-foreground">{t('equipment.referencePrice')}:</span> {formatMoney(equipment.unit_price)} AFN</div>
          <div><span className="text-muted-foreground">{t('equipment.brand')}:</span> {equipment.brand || '-'}</div>
          <div><span className="text-muted-foreground">{t('equipment.model')}:</span> {equipment.model || '-'}</div>
          {equipment.description && <div className="sm:col-span-2"><span className="text-muted-foreground">{t('equipment.description')}:</span> {equipment.description}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('equipment.depreciationCategories')}</CardTitle>
          <CardDescription>{t('equipment.stockCategory5Hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stockLevels.map((level) => (
              <div key={level.key} className={`border rounded-lg p-3 text-center ${level.out ? 'bg-muted/50' : ''}`}>
                <p className="text-xs text-muted-foreground">{t(`equipment.stockCategory${level.key}`)}</p>
                <p className="text-xl font-bold mt-1">{level.qty}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t(`equipment.categoryDescriptions.${level.key}`)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canMoveStock && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4" />
              {t('equipment.moveStock')}
            </CardTitle>
            <CardDescription>{t('equipment.moveStockDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMovement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('equipment.fromCategory')}</Label>
                  <Autocomplete
                    options={fromOptions}
                    value={movementForm.from_category}
                    onChange={(v) => {
                      const from = v as string;
                      setMovementForm((p) => ({
                        ...p,
                        from_category: from,
                        to_category: resolveDefaultToCategory(from),
                      }));
                    }}
                    getOptionLabel={(o) => o.label}
                    getOptionValue={(o) => o.value}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('equipment.toCategory')}</Label>
                  <Autocomplete
                    options={toOptions}
                    value={movementForm.to_category}
                    onChange={(v) => setMovementForm((p) => ({ ...p, to_category: v as string }))}
                    getOptionLabel={(o) => o.label}
                    getOptionValue={(o) => o.value}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.quantity')}</Label>
                <NumericInput allowDecimal={false}
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm((p) => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('equipment.notes')}</Label>
                <Textarea
                  rows={2}
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {t('equipment.moveStock')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t('equipment.movementHistory')}</CardTitle></CardHeader>
        <CardContent>
          {movementList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('equipment.noMovements')}</p>
          ) : (
            <div className="space-y-2">
              {movementList.map((m: any) => (
                <div key={m.id} className="flex flex-wrap items-center gap-2 border rounded-md p-3 text-sm">
                  <Badge variant="outline">{m.quantity}</Badge>
                  <span>
                    {m.from_category
                      ? `${t('equipment.from')} ${t(`equipment.stockCategory${m.from_category}`)}`
                      : t('equipment.newStock')}
                  </span>
                  <span>→</span>
                  <span>{t('equipment.to')} {t(`equipment.stockCategory${m.to_category}`)}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                  {m.moved_by_name && <span className="text-xs text-muted-foreground w-full">{t('equipment.movedBy')}: {m.moved_by_name}</span>}
                  {m.notes && <span className="text-xs text-muted-foreground w-full">{m.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EquipmentDetails;
