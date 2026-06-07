import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { getYearsArray } from '@/utils/calendar';
import useUpdate from '@/api/useUpdate';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';
import DatePicker from '@/components/ui/date-picker-calendar';

interface RentalFinancialInfo {
  shop: { shop_number: string; name: string };
  tenant: { full_name: string };
  currency: string;
  monthly_rent: number;
  current_month: {
    total_paid: number;
    remaining: number;
    is_paid: boolean;
    payment_percentage: number;
  };
  rental_period: {
    start_date: string;
    end_date: string;
    is_active: boolean;
  };
}

const EditShopRentalPayment = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({
    rental: '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_status: 'completed',
    period_month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    period_year: '',
    description: '',
    receipt: null as File | null
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [selectedRentalInfo, setSelectedRentalInfo] = useState<RentalFinancialInfo | null>(null);

  const { data: payment } = useFetchObject({
    queryKey: ['shop-rental-payment', id],
    endpoint: `shop-rental-payments/${id}/`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({
    queryKey: ['shop-rental-payments'],
  });

  // Fetch rental financial info when rental is selected
  const { data: financialInfo, refetch: refetchFinancialInfo } = useFetchObject<RentalFinancialInfo>({
    queryKey: ['rental-financial-info', formData.rental, formData.period_month, formData.period_year],
    endpoint: `shop-rentals/${formData.rental}/financial_info/?month=${formData.period_month}&year=${formData.period_year}`,
    enabled: !!formData.rental
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        rental: payment.rental?.id?.toString() || payment.rental?.toString() || '',
        amount: payment.amount?.toString() || '',
        payment_date: payment.payment_date ? payment.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        payment_status: payment.payment_status || 'completed',
        period_month: payment.period_month || (new Date().getMonth() + 1).toString().padStart(2, '0'),
        period_year: payment.period_year || '',
        description: payment.description || '',
        receipt: null
      });
    }
  }, [payment]);

  useEffect(() => {
    if (financialInfo) {
      setSelectedRentalInfo(financialInfo);
    }
  }, [financialInfo]);

  // Refetch financial info when month or year changes
  useEffect(() => {
    if (formData.rental) {
      refetchFinancialInfo();
    }
  }, [formData.period_month, formData.period_year, formData.rental, refetchFinancialInfo]);

  useEffect(() => {
    if (isSuccess) {
      navigate('/shop-rental-payments');
    }
  }, [isSuccess, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.rental) newErrors.rental = t('validation.required');
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = t('validation.positive');
    if (!formData.payment_date) newErrors.payment_date = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;

    const submitData = new FormData();
    submitData.append('rental', formData.rental);
    submitData.append('amount', formData.amount);
    submitData.append('payment_date', formData.payment_date);
    submitData.append('payment_status', formData.payment_status);
    submitData.append('period_month', formData.period_month);
    submitData.append('period_year', formData.period_year);
    if (formData.description?.trim()) {
      submitData.append('description', formData.description.trim());
    }
    if (formData.receipt) {
      submitData.append('receipt', formData.receipt);
    }
    if (removeReceipt) {
      submitData.append('remove_receipt', 'true');
    }

    handleUpdate(id, submitData);
  };

  const shamsiMonths = [
    { value: 1, label: t('calendar.shamsiMonth1', 'حمل') },
    { value: 2, label: t('calendar.shamsiMonth2', 'ثور') },
    { value: 3, label: t('calendar.shamsiMonth3', 'جوزا') },
    { value: 4, label: t('calendar.shamsiMonth4', 'سرطان') },
    { value: 5, label: t('calendar.shamsiMonth5', 'اسد') },
    { value: 6, label: t('calendar.shamsiMonth6', 'سنبله') },
    { value: 7, label: t('calendar.shamsiMonth7', 'میزان') },
    { value: 8, label: t('calendar.shamsiMonth8', 'عقرب') },
    { value: 9, label: t('calendar.shamsiMonth9', 'قوس') },
    { value: 10, label: t('calendar.shamsiMonth10', 'جدی') },
    { value: 11, label: t('calendar.shamsiMonth11', 'دلو') },
    { value: 12, label: t('calendar.shamsiMonth12', 'حوت') }
  ];

  const qamariMonths = [
    { value: 1, label: t('calendar.qamariMonth1', 'محرم الحرام') },
    { value: 2, label: t('calendar.qamariMonth2', 'صفر المظفر') },
    { value: 3, label: t('calendar.qamariMonth3', 'ربيع الاول') },
    { value: 4, label: t('calendar.qamariMonth4', 'ربيع الثاني') },
    { value: 5, label: t('calendar.qamariMonth5', 'جمادی الاول') },
    { value: 6, label: t('calendar.qamariMonth6', 'جمادی الثاني') },
    { value: 7, label: t('calendar.qamariMonth7', 'رجب المرجب') },
    { value: 8, label: t('calendar.qamariMonth8', 'شعبان المعظم') },
    { value: 9, label: t('calendar.qamariMonth9', 'رمضان المبارک') },
    { value: 10, label: t('calendar.qamariMonth10', 'شوال المکرم') },
    { value: 11, label: t('calendar.qamariMonth11', 'ذی القعده') },
    { value: 12, label: t('calendar.qamariMonth12', 'ذی الحجه') }
  ];

  const months = calendarType === 'shamsi' ? shamsiMonths : qamariMonths;

  const years = getYearsArray(calendarType, 10);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/shop-rental-payments')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('shop-rental.editPayment')}</h1>
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
          <CardDescription>{t('shop-reNTAl.paymentDetailsDesc', 'Update rental payment information')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rental Selection with Financial Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="rental">{t('shop-rental.rental')} *</Label>
                <Autocomplete
                  endpoint="shop-rentals/"
                  value={formData.rental}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, rental: value }));
                    if (errors.rental) setErrors(prev => ({ ...prev, rental: '' }));
                  }}
                  placeholder={t('shop-rental.selectRental')}
                  getOptionLabel={(r: any) => `${r.shop?.shop_number || ''} - ${r.tenant?.full_name || ''}`}
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
                    
                    {/* Financial Summary in One Row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.monthlyRent')}</div>
                        <div className="font-bold text-lg">{formatNumber(selectedRentalInfo.monthly_rent)} <span className="text-sm font-normal">{selectedRentalInfo.currency}</span></div>
                      </div>
                      
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.paidThisMonth')}</div>
                        <div className="font-bold text-lg text-green-600">{formatNumber(selectedRentalInfo.current_month.total_paid)} <span className="text-sm font-normal">{selectedRentalInfo.currency}</span></div>
                      </div>
                      
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.remaining')}</div>
                        <div className={`font-bold text-lg ${selectedRentalInfo.current_month.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatNumber(selectedRentalInfo.current_month.remaining)} <span className="text-sm font-normal">{selectedRentalInfo.currency}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{t('shop-rental.paymentProgress')}</span>
                        <span>{selectedRentalInfo.current_month.payment_percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${selectedRentalInfo.current_month.is_paid ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(selectedRentalInfo.current_month.payment_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {selectedRentalInfo.current_month.is_paid ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span>{t('shop-rental.monthFullyPaid')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{t('shop-rental.monthPendingPayment')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">{t('shop-rental.amount')} *</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, amount: e.target.value }));
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                    }}
                    placeholder={t('shop-rental.enterAmount')}
                    className="pl-8"
                  />
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
              </div>

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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period_month">{t('shop-rental.periodMonth')} *</Label>
                <select
                  id="period_month"
                  value={formData.period_month}
                  onChange={(e) => setFormData(prev => ({ ...prev, period_month: e.target.value }))}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value.toString().padStart(2, '0')}>{month.label}</option>
                  ))}
                </select>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="receipt">{t('shop-rental.receipt')}</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt: e.target.files?.[0] || null }))}
                />
                {payment?.receipt && (
                  <div className="flex items-center gap-2 mt-2">
                    <a 
                      href={payment.receipt} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {t('shop-rental.viewCurrentReceipt')}
                    </a>
                    <label className="flex items-center gap-1 text-xs text-red-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeReceipt}
                        onChange={(e) => setRemoveReceipt(e.target.checked)}
                        className="mr-1"
                      />
                      {t('shop-rental.remove')}
                    </label>
                  </div>
                )}
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
                {loading ? t('common.updating') : t('common.update')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditShopRentalPayment;