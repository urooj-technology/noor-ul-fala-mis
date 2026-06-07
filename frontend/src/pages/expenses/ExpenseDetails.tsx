import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObjects from '@/api/useFetchObjects';

const ExpenseDetails = () => {
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: expense, isLoading } = useFetchObjects({
    queryKey: ['expense', id],
    endpoint: `expenses/${id}/`,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!expense) {
    return <div className="flex items-center justify-center h-64">Expense not found</div>;
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate('/expenses')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('common.back')}
      </Button>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold mb-2text-sm">{t('expenses.expenseDetails')}</h1>
            <p className="text-blue-100text-xs">{expense.category_details?.name || 'N/A'}</p>
          </div>
          <Receipt className="h-16 w-16 opacity-50" />
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('expenses.expenseInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-base text-muted-foregroundtext-xs">{t('expenses.category')}</p>
              <Badge variant="outline" className="mt-1">
                {expense.category_details?.name || 'N/A'}
              </Badge>
            </div>
            <div>
              <p className="text-base text-muted-foregroundtext-xs">{t('expenses.amount')}</p>
              <p className="font-medium text-base text-primarytext-xs">
                {Number(expense.amount)?.toFixed(2)} {expense.currency_details?.symbol || expense.currency_details?.code || ''}
              </p>
            </div>
            <div>
              <p className="text-base text-muted-foregroundtext-xs">{t('expenses.currency')}</p>
              <Badge variant="secondary" className="mt-1">
                {expense.currency_details ? `${expense.currency_details.code} (${expense.currency_details.symbol})` : 'N/A'}
              </Badge>
            </div>
            <div>
              <p className="text-base text-muted-foregroundtext-xs">{t('expenses.expenseDate')}</p>
              <div className="space-y-1">
                {calendarType === 'shamsi' && expense.expense_date_shamsi && (
                  <p className="font-medium text-sm">
                    {formatDateByCalendarType(expense.expense_date, calendarType, lang)}
                  </p>
                )}
                {calendarType === 'qamari' && expense.expense_date_qamari && (
                  <p className="font-medium text-sm">
                    {formatDateByCalendarType(expense.expense_date, calendarType, lang)}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-base text-muted-foregroundtext-xs">{t('expenses.user')}</p>
              <p className="font-mediumtext-xs">{expense.user_details?.fullname || 'N/A'}</p>
            </div>
            <div>
              <p className="text-base text-muted-foregroundtext-xs">{t('expenses.receipt')}</p>
              {expense.receipt ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default" className="flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    {t('expenses.hasReceipt')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(expense.receipt, '_blank')}
                    className="h-8"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="mt-1">No receipt</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {expense.description && (
          <Card>
            <CardHeader>
              <CardTitle>{t('expenses.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foregroundtext-xs">{expense.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExpenseDetails;
