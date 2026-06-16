import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, CreditCard, CheckCircle, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { getMonthNames, getYearsArray } from '@/utils/calendar';
import useAdd from '@/api/useAdd';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';
import DatePicker from '@/components/ui/date-picker-calendar';

interface RentalFinancialInfo {
  shop: { shop_number: string; name: string };
  tenant: { full_name: string };
  currency: string;
  monthly_rent: number;
  months?: Record<string, { paid: number; remaining: number; is_paid: boolean; rent: number; payment_percentage: number }>;
  summary?: {
    total_paid_year: number;
    total_remaining_year: number;
    months_paid_count: number;
    months_pending_count: number;
    total_rent_year: number;
  };
}

// Month Multi-Select Component
interface MonthMultiSelectProps {
  months: { value: string; label: string }[];
  selectedMonths: string[];
  onToggle: (monthValue: string) => void;
  currency: string;
  monthlyRent: number;
}

const MonthMultiSelect: React.FC<MonthMultiSelectProps> = ({
  months,
  selectedMonths,
  onToggle,
  currency,
  monthlyRent,
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabels = months
    .filter((m) => selectedMonths.includes(m.value))
    .map((m) => m.label);

  const totalForEntry = (monthlyRent || 0) * selectedMonths.length;

  const formatCurrency = (amount: number | string, curr: string = 'AFN') => {
    const val = typeof amount === 'string' ? parseFloat(amount) || 0 : amount ?? 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-9 text-xs font-normal hover:bg-muted/50"
          >
            <span className="truncate">
              {selectedMonths.length === 0
                ? 'Select months…'
                : selectedMonths.length === 1
                ? selectedLabels[0]
                : `${selectedMonths.length} months selected`}
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder="Search month…" className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>No month found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[250px]">
                  {months.map((month) => {
                    const isSelected = selectedMonths.includes(month.value);
                    return (
                      <CommandItem
                        key={month.value}
                        value={month.label}
                        onSelect={() => onToggle(month.value)}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-muted-foreground/40'
                          }`}
                        >
                          {isSelected && <CheckCircle className="h-3 w-3" />}
                        </span>
                        <span className="flex-1">{month.label}</span>
                        {isSelected && monthlyRent > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatCurrency(monthlyRent, currency)}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
          {selectedMonths.length > 0 && (
            <>
              <Separator />
              <div className="px-3 py-2 flex flex-wrap gap-1">
                {selectedMonths.map((mv) => {
                  const ml = months.find((m) => m.value === mv);
                  return (
                    <Badge
                      key={mv}
                      variant="secondary"
                      className="text-[10px] h-5 gap-0.5 pr-1 pl-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                    >
                      {ml?.label}
                      <button
                        className="ml-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(mv);
                        }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      {selectedMonths.length > 0 && monthlyRent > 0 && (
        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{selectedMonths.length} months selected</span>
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            Total: {formatCurrency(totalForEntry, currency)}
          </span>
        </div>
      )}
    </div>
  );
};

const AddShopRentalPayment = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = t('language.code') as 'fa' | 'ps';
  
  // Get current Shamsi year for default
  const getCurrentShamsiYear = () => {
    const gregorianDate = new Date();
    const gregorianYear = gregorianDate.getFullYear();
    const gregorianMonth = gregorianDate.getMonth() + 1; // 0-indexed
    const gregorianDay = gregorianDate.getDate();
    // Approximate Shamsi year (Shamsi year starts around March 21)
    // If before March 21, subtract 1 from the conversion
    const shamsiYear = gregorianMonth < 3 || (gregorianMonth === 3 && gregorianDay < 21)
      ? gregorianYear - 622
      : gregorianYear - 621;
    return shamsiYear.toString();
  };

  const [formData, setFormData] = useState({
    rental: searchParams.get('rental_id') || '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_status: 'completed',
    period_months: [] as string[],
    period_year: getCurrentShamsiYear(),
    description: '',
    receipt: null as File | null
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedRentalInfo, setSelectedRentalInfo] = useState<RentalFinancialInfo | null>(null);
  const [isAmountManuallyEdited, setIsAmountManuallyEdited] = useState(false);

  const { handleAdd, loading, isSuccess } = useAdd<FormData>({
    queryKey: ['shop-rental-payments'],
    endpoint: 'shop-rental-payments/',
  });

  // Fetch rental financial info
  const { data: financialInfo, refetch: refetchFinancialInfo } = useFetchObject<RentalFinancialInfo>({
    queryKey: ['rental-financial-info', formData.rental, formData.period_year, calendarType],
    endpoint: formData.rental
      ? `shop-rental-payments/rental_financial_info/?rental_id=${formData.rental}&year=${formData.period_year}&calendar_type=${calendarType}`
      : '',
    enabled: !!formData.rental
  });

  useEffect(() => {
    if (financialInfo) {
      setSelectedRentalInfo(financialInfo);
    }
  }, [financialInfo]);

  useEffect(() => {
    if (isSuccess) {
      navigate('/shop-rental-payments');
    }
  }, [isSuccess, navigate]);

  // Get months based on calendar type from settings
  const months = useMemo(() => {
    return getMonthNames(calendarType, lang).map((label, i) => ({
      value: (i + 1).toString().padStart(2, '0'),
      label,
    }));
  }, [calendarType, lang]);

  const years = getYearsArray(calendarType, 10);

  // Toggle month selection
  const toggleMonth = (monthValue: string) => {
    setFormData(prev => {
      const newMonths = prev.period_months.includes(monthValue)
        ? prev.period_months.filter(m => m !== monthValue)
        : [...prev.period_months, monthValue].sort();
      
      // Auto-calculate total amount based on selected months and monthly rent
      let newAmount = prev.amount;
      if (selectedRentalInfo?.monthly_rent && !isAmountManuallyEdited) {
        newAmount = (newMonths.length * selectedRentalInfo.monthly_rent).toString();
      }
      
      return {
        ...prev,
        period_months: newMonths,
        amount: newAmount
      };
    });
  };

  // Calculate display values
  const monthsCount = formData.period_months.length;
  const totalAmount = parseFloat(formData.amount) || 0;
  const amountPerMonth = monthsCount > 0 ? totalAmount / monthsCount : 0;

  // Reset manual edit flag when rental changes
  useEffect(() => {
    setIsAmountManuallyEdited(false);
  }, [formData.rental]);

  // Auto-fill amount when rental info is loaded and months are already selected
  useEffect(() => {
    if (selectedRentalInfo?.monthly_rent && formData.period_months.length > 0 && !isAmountManuallyEdited) {
      const calculatedAmount = formData.period_months.length * selectedRentalInfo.monthly_rent;
      setFormData(prev => ({ ...prev, amount: calculatedAmount.toString() }));
    }
  }, [selectedRentalInfo]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.rental) newErrors.rental = t('validation.required');
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('validation.positive');
    if (!formData.payment_date) newErrors.payment_date = t('validation.required');
    if (formData.period_months.length === 0) newErrors.period_months = 'Select at least one month';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = new FormData();
    submitData.append('rental', formData.rental);
    submitData.append('amount', formData.amount);
    submitData.append('payment_date', formData.payment_date);
    submitData.append('payment_status', formData.payment_status);
    submitData.append('period_months', JSON.stringify(formData.period_months));
    submitData.append('period_year', formData.period_year);
    submitData.append('calendar_type', calendarType); // Use calendar type from settings
    if (formData.description?.trim()) {
      submitData.append('description', formData.description.trim());
    }
    if (formData.receipt) {
      submitData.append('receipt', formData.receipt);
    }

    handleAdd(submitData);
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/shop-rental-payments')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('shop-rental.addPayment')}</h1>
            <p className="text-sm text-muted-foreground">{t('shop-rental.managePayments', 'Manage Rental Payments')}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t('shop-rental.paymentDetails', 'Payment Details')}
          </CardTitle>
          <CardDescription>{t('shop-rental.paymentDetailsDesc', 'Record a new rental payment')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rental Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="rental">{t('shop-rental.rental')} *</Label>
                <Autocomplete
                  endpoint="shop-rentals/"
                  value={formData.rental}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, rental: value, amount: '', period_months: [] }));
                    if (errors.rental) setErrors(prev => ({ ...prev, rental: '' }));
                  }}
                  placeholder={t('shop-rental.selectRental')}
                  getOptionLabel={(r: any) => `${r.shop?.shop_number || ''} - ${r.shop?.name || ''} | ${r.tenant?.full_name || ''}`}
                  getOptionValue={(r: any) => r.id.toString()}
                />
                {errors.rental && <p className="text-xs text-destructive mt-1">{errors.rental}</p>}
              </div>

              {/* Financial Info Card */}
              {selectedRentalInfo && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedRentalInfo.shop.shop_number} - {selectedRentalInfo.shop.name}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm text-muted-foreground">{selectedRentalInfo.tenant.full_name}</span>
                      </div>
                      <span className="text-sm font-medium">{selectedRentalInfo.currency}</span>
                    </div>
                    
                    {/* Yearly Summary */}
                    {selectedRentalInfo.summary && (
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.monthlyRent')}</div>
                          <div className="font-bold text-lg">{formatNumber(selectedRentalInfo.monthly_rent)}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Paid ({formData.period_year})</div>
                          <div className="font-bold text-lg text-green-600">{formatNumber(selectedRentalInfo.summary.total_paid_year)}</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Remaining</div>
                          <div className="font-bold text-lg text-red-600">{formatNumber(selectedRentalInfo.summary.total_remaining_year)}</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Months Paid</div>
                          <div className="font-bold text-lg">{selectedRentalInfo.summary.months_paid_count}/12</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Payment Date and Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_date">{t('shop-rental.paymentDate')} *</Label>
                <DatePicker
                  value={formData.payment_date}
                  onChange={(date) => {
                    setFormData(prev => ({ ...prev, payment_date: date?.toISOString().slice(0, 10) || '' }));
                    if (errors.payment_date) setErrors(prev => ({ ...prev, payment_date: '' }));
                  }}
                />
                {errors.payment_date && <p className="text-xs text-destructive mt-1">{errors.payment_date}</p>}
              </div>

              <div>
                <Label htmlFor="period_year">{t('shop-rental.periodYear')} *</Label>
                <select
                  id="period_year"
                  value={formData.period_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_year: e.target.value }))}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  {years.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Selection - comes before amount */}
            <div>
              <Label htmlFor="period_months">{t('shop-rental.selectMonths', 'Select Months')} *</Label>
              <MonthMultiSelect
                months={months}
                selectedMonths={formData.period_months}
                onToggle={toggleMonth}
                currency={selectedRentalInfo?.currency || 'AFN'}
                monthlyRent={selectedRentalInfo?.monthly_rent || 0}
              />
              {errors.period_months && <p className="text-xs text-destructive mt-1">{errors.period_months}</p>}
            </div>

            {/* Total Amount - comes after months selection, auto-filled based on selected months */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">{t('shop-rental.totalAmount', 'Total Amount')} *</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, amount: e.target.value }));
                      setIsAmountManuallyEdited(true);
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                    }}
                    placeholder={t('shop-rental.enterAmount')}
                    className="pl-8"
                  />
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
                {selectedRentalInfo?.monthly_rent && monthsCount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {monthsCount} months × {formatNumber(selectedRentalInfo.monthly_rent)} = {formatNumber(monthsCount * selectedRentalInfo.monthly_rent)} {selectedRentalInfo.currency}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="payment_status">{t('shop-rental.paymentStatus')} *</Label>
                <select
                  id="payment_status"
                  value={formData.payment_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="pending">{t('shop-rental.paymentStatusOptions.pending')}</option>
                  <option value="completed">{t('shop-rental.paymentStatusOptions.completed')}</option>
                  <option value="cancelled">{t('shop-rental.paymentStatusOptions.cancelled')}</option>
                  <option value="refunded">{t('shop-rental.paymentStatusOptions.refunded')}</option>
                </select>
              </div>
            </div>

            {/* Total Display */}
            {monthsCount > 0 && formData.amount && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">
                      {t('shop-rental.totalPayment', 'Total Payment')}:
                    </span>
                  </div>
                  <span className="font-bold text-lg text-emerald-700 dark:text-emerald-400">
                    {formatNumber(totalAmount)} {selectedRentalInfo?.currency || 'AFN'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {monthsCount} month{monthsCount > 1 ? 's' : ''} × {formatNumber(amountPerMonth)} per month
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="receipt">{t('shop-rental.receipt')}</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt: e.target.files?.[0] || null }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{t('shop-rental.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('shop-rental.enterDescription')}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/shop-rental-payments')} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('common.adding') : t('common.add')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddShopRentalPayment;
