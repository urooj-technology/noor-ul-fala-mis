import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Receipt, DollarSign, Calendar, CheckCircle, XCircle, Plus, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType, getMonthNames, getYearsArray } from '@/utils/calendar';
import useFetchObject from '@/api/useFetchObject';
import useDelete from '@/api/useDelete';
import { formatNumber } from '@/lib/formatNumber';
import ShopRentalPrint from './ShopRentalPrint';

interface MonthlyStatus {
  [key: string]: {
    month: string;
    rent: number;
    paid: number;
    remaining: number;
    is_paid: boolean;
    payment_percentage: number;
    payment_count: number;
  };
}

interface RentalDetails {
  id: number;
  shop: { id: number; shop_number: string; name: string; location: string };
  tenant: { id: number; full_name: string; phone: string; email: string };
  start_date: string;
  end_date: string;
  monthly_rent: number;
  currency: string;
  rental_status: string;
  security_deposit: number;
  description: string;
  is_active: boolean;
  is_expired: boolean;
  payment_summary: {
    total_paid_year: number;
    total_remaining_year: number;
    total_expected_year: number;
    months_paid_count: number;
    months_pending_count: number;
    months_status: MonthlyStatus;
    year: number;
  };
}

const ShopRentalDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const { id } = useParams();
  const lang = t('language.code') as 'fa' | 'ps';

  // Get current Shamsi year
  const getCurrentShamsiYear = () => {
    const gregorianDate = new Date();
    const gregorianYear = gregorianDate.getFullYear();
    const gregorianMonth = gregorianDate.getMonth() + 1;
    const gregorianDay = gregorianDate.getDate();
    return gregorianMonth < 3 || (gregorianMonth === 3 && gregorianDay < 21)
      ? gregorianYear - 622
      : gregorianYear - 621;
  };

  const [selectedYear, setSelectedYear] = useState(getCurrentShamsiYear().toString());
  const [showPrint, setShowPrint] = useState(false);

  const { data: rental, isLoading, refetch } = useFetchObject<RentalDetails>({
    queryKey: ['shop-rental-details', id, selectedYear],
    endpoint: `shop-rentals/${id}/?year=${selectedYear}`,
  });

  const { handleDelete, ConfirmDialog } = useDelete({
    queryKey: ['shop-rentals'],
    endpoint: 'shop-rentals',
    onSuccess: () => navigate('/shop-rentals'),
  });

  const monthNames = getMonthNames(calendarType, lang);
  const years = getYearsArray(calendarType, 10);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      renewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    return (
      <Badge className={colors[status] || ''}>
        {t(`shop-rental.rentalStatusOptions.${status}`) || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-muted-foreground">{t('shop-rental.rentalNotFound')}</p>
      </div>
    );
  }

  const monthsStatus = rental.payment_summary?.months_status || {};
  const summary = rental.payment_summary;

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/shop-rentals')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPrint(true)}>
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print', 'Print')}
          </Button>
          <Button onClick={() => navigate(`/shop-rental-payments/add?rental_id=${rental.id}`)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('shop-rental.addPayment')}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/shop-rentals/${rental.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t('shop-rental.rentalDetails')}
            </CardTitle>
            {getStatusBadge(rental.rental_status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Shop Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{t('shop-rental.shop')}</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="font-bold">{rental.shop?.shop_number} - {rental.shop?.name}</p>
                <p className="text-xs text-muted-foreground">{rental.shop?.location}</p>
              </div>
            </div>

            {/* Tenant Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{t('shop-rental.tenant')}</h3>
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="font-bold">{rental.tenant?.full_name}</p>
                <p className="text-xs text-muted-foreground">{rental.tenant?.phone}</p>
              </div>
            </div>

            {/* Rental Period */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{t('shop-rental.rentalPeriod')}</h3>
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{formatDateByCalendarType(rental.start_date, calendarType, lang)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">→</span>
                  <span className="text-sm">{formatDateByCalendarType(rental.end_date, calendarType, lang)}</span>
                </div>
              </div>
            </div>

            {/* Monthly Rent */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">{t('shop-rental.monthlyRent')}</h3>
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <p className="font-bold text-lg">{formatNumber(rental.monthly_rent)} {rental.currency}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Financial Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('shop-rental.yearlySummary', 'Yearly Financial Summary')}
            </CardTitle>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 border rounded-md bg-background text-sm"
            >
              {years.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.monthlyRent')}</div>
                <div className="font-bold text-xl">{formatNumber(rental.monthly_rent)}</div>
                <div className="text-xs text-muted-foreground">{rental.currency}</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.totalPaidYear', 'Paid This Year')}</div>
                <div className="font-bold text-xl text-green-600">{formatNumber(summary.total_paid_year)}</div>
                <div className="text-xs text-muted-foreground">{rental.currency}</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.totalRemainingYear', 'Remaining')}</div>
                <div className="font-bold text-xl text-red-600">{formatNumber(summary.total_remaining_year)}</div>
                <div className="text-xs text-muted-foreground">{rental.currency}</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.monthsPaid', 'Months Paid')}</div>
                <div className="font-bold text-xl text-emerald-600">{summary.months_paid_count}</div>
                <div className="text-xs text-muted-foreground">/ 12</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-muted-foreground mb-1">{t('shop-rental.monthsPending', 'Months Pending')}</div>
                <div className="font-bold text-xl text-orange-600">{summary.months_pending_count}</div>
                <div className="text-xs text-muted-foreground">/ 12</div>
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Monthly Breakdown Table */}
          <div>
            <h3 className="font-semibold mb-4">{t('shop-rental.monthlyBreakdown', 'Monthly Payment Status')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">{t('shop-rental.month')}</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">{t('shop-rental.rent')}</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">{t('shop-rental.paid')}</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">{t('shop-rental.remaining')}</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">{t('shop-rental.progress')}</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">{t('shop-rental.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(monthsStatus).map(([monthNum, status]) => {
                    const monthIdx = parseInt(monthNum) - 1;
                    const monthLabel = monthNames[monthIdx] || monthNum;
                    
                    return (
                      <tr key={monthNum} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <span className="font-medium text-sm">{monthLabel}</span>
                        </td>
                        <td className="p-2 text-right">
                          <span className="text-sm">{formatNumber(status.rent)}</span>
                        </td>
                        <td className="p-2 text-right">
                          <span className={`text-sm font-medium ${status.paid > 0 ? 'text-green-600' : ''}`}>
                            {formatNumber(status.paid)}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <span className={`text-sm font-medium ${status.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatNumber(status.remaining)}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${status.is_paid ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(status.payment_percentage, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {status.payment_percentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {status.is_paid ? (
                            <div className="flex items-center justify-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">{t('shop-rental.paid', 'Paid')}</span>
                            </div>
                          ) : status.paid > 0 ? (
                            <div className="flex items-center justify-center gap-1 text-yellow-600">
                              <span className="text-xs">{t('shop-rental.partial', 'Partial')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">{t('shop-rental.unpaid', 'Unpaid')}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold bg-muted/30">
                    <td className="p-2">{t('shop-rental.total')}</td>
                    <td className="p-2 text-right">{formatNumber(rental.monthly_rent * 12)}</td>
                    <td className="p-2 text-right text-green-600">{formatNumber(summary?.total_paid_year || 0)}</td>
                    <td className="p-2 text-right text-red-600">{formatNumber(summary?.total_remaining_year || 0)}</td>
                    <td className="p-2"></td>
                    <td className="p-2 text-center">
                      {summary?.months_paid_count || 0}/12 {t('shop-rental.monthsPaid')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Deposit */}
      {rental.security_deposit > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('shop-rental.securityDeposit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('shop-rental.amount')}</span>
              <span className="font-bold text-lg">{formatNumber(rental.security_deposit)} {rental.currency}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {rental.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('shop-rental.description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{rental.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Print Component */}
      {showPrint && (
        <ShopRentalPrint
          rentalId={rental.id}
          year={selectedYear}
          onClose={() => setShowPrint(false)}
        />
      )}

      <ConfirmDialog />
    </div>
  );
};

export default ShopRentalDetails;
