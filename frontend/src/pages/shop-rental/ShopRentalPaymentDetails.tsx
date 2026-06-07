import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, FileText, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObject from '@/api/useFetchObject';
import { formatNumber } from '@/lib/formatNumber';

const ShopRentalPaymentDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const navigate = useNavigate();
  const { id } = useParams();
  const [deleteMode, setDeleteMode] = useState(false);

  const { data: payment, isLoading } = useFetchObject({
    queryKey: ['shop-rental-payment', id],
    endpoint: `shop-rental-payments/${id}/`,
  });

  useEffect(() => {
    document.title = payment ? `${t('shop-rental.paymentDetails')} - ${payment.reference_number}` : t('shop-rental.paymentDetails');
  }, [payment]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100'}>
        {t(`shop-rental.paymentStatusOptions.${status}`) || status}
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

  if (!payment) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-muted-foreground">{t('shop-rental.paymentNotFound')}</p>
      </div>
    );
  }

  const lang = t('language.code') as 'fa' | 'ps';

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/shop-rental-payments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/shop-rental-payments/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('shop-rental.paymentDetails')}
            </CardTitle>
            {getStatusBadge(payment.payment_status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reference & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('shop-rental.referenceNumber')}</p>
              <p className="font-mono font-semibold text-lg">{payment.reference_number}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t('shop-rental.amount')}</p>
              <p className="font-semibold text-2xl text-green-600">
                {formatNumber(payment.amount)} {payment.currency}
              </p>
            </div>
          </div>

          <Separator />

          {/* Rental Info */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('shop-rental.rentalInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('shop-rental.shop')}</span>
                  <span className="font-medium">{payment.rental_details?.shop_number} - {payment.rental_details?.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('shop-rental.tenant')}</span>
                  <span className="font-medium">{payment.rental_details?.tenant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t('shop-rental.monthlyRent')}</span>
                  <span className="font-medium">{formatNumber(payment.rental_details?.monthly_rent)} {payment.currency}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('shop-rental.paymentDetails')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shop-rental.paymentDate')}</span>
                </div>
                <p className="font-semibold">
                  {formatDateByCalendarType(payment.payment_date, calendarType, lang)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shop-rental.period')}</span>
                </div>
                <p className="font-semibold">{payment.period_month}/{payment.period_year}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shop-rental.currency')}</span>
                </div>
                <p className="font-semibold">{payment.currency}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {payment.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">{t('shop-rental.description')}</h3>
                <p className="text-muted-foreground">{payment.description}</p>
              </div>
            </>
          )}

          {/* Receipt */}
          {payment.receipt && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">{t('shop-rental.receipt')}</h3>
                <Button variant="outline" onClick={() => window.open(payment.receipt, '_blank')}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t('shop-rental.viewReceipt')}
                </Button>
              </div>
            </>
          )}

          {/* Transaction Info */}
          {payment.transaction_details && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">{t('shop-rental.transactionInfo')}</h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t('shop-rental.transactionNumber')}:</span>{' '}
                    <span className="font-mono">{payment.transaction_details.number}</span>
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p>{t('common.createdAt')}: {new Date(payment.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p>{t('common.updatedAt')}: {new Date(payment.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopRentalPaymentDetails;