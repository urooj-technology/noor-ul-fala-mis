import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatDateByCalendarType } from '@/utils/calendar';
import useFetchObject from '@/api/useFetchObject';
import { ArrowLeft, FileText, Hash } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';

const JournalEntryDetails = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const { calendarType } = useCalendar();
  const lang = t('language.code') as 'fa' | 'ps';
  const navigate = useNavigate();

  const { data: entry, loading } = useFetchObject({
    queryKey: ['journal-entry', id],
    endpoint: `journal-entries/${id}`,
  });

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  if (!entry) {
    return <div className="p-6">{t('accounting.notFound', 'Journal entry not found')}</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/journal-entries')} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('accounting.journalEntries')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounting.viewDetails')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('accounting.transactionDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('accounting.date')}</p>
              <p className="font-medium">{formatDateByCalendarType(entry.date, calendarType, lang)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('accounting.account')}</p>
              <p className="font-medium">{entry.account_name || '-'}</p>
              <p className="text-xs text-muted-foreground">{entry.account_code}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('accounting.debit')}</p>
              <p className="font-bold text-green-600">{formatNumber(entry.debit)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('accounting.credit')}</p>
              <p className="font-bold text-blue-600">{formatNumber(entry.credit)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('accounting.description')}</p>
              <p className="font-medium">{entry.description || '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('accounting.transactionReference')}</p>
              <p className="font-medium">{entry.reference || '-'}</p>
            </div>
          </div>

          {entry.transaction_number && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">{t('accounting.transaction')}</p>
              <Badge variant="secondary" className="ml-2">{entry.transaction_number}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalEntryDetails;
