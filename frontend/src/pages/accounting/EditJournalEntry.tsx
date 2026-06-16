import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DatePicker } from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, FileText } from 'lucide-react';
import useFetchObject from '@/api/useFetchObject';
import useUpdate from '@/api/useUpdate';
import { formatNumber } from '@/lib/formatNumber';

const EditJournalEntry = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [entries, setEntries] = useState<{ account: string; debit: number; credit: number }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: entryData, loading: fetchLoading } = useFetchObject({
    queryKey: ['journal-entry', id],
    endpoint: `journal-entries/${id}`,
  });

  const { handleUpdate, loading, isSuccess } = useUpdate({
    queryKey: ['journal-entries'],
    endpoint: `journal-entries/${id}/`,
  });

  useEffect(() => {
    if (entryData) {
      setDate(entryData.date || '');
      setDescription(entryData.description || '');
      setReference(entryData.reference || '');
      if (entryData.account) {
        setEntries([{ 
          account: String(entryData.account), 
          debit: entryData.debit || 0, 
          credit: entryData.credit || 0 
        }]);
      }
    }
  }, [entryData]);

  const calculateTotalDebit = () => entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const calculateTotalCredit = () => entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const isBalanced = calculateTotalDebit() === calculateTotalCredit();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = t('validation.required');
    if (!isBalanced && entries.length > 1) newErrors.balance = t('accounting.transactionNotBalanced');
    if (entries.some(e => !e.account)) newErrors.accounts = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    handleUpdate({
      date,
      description,
      reference,
      account: entries[0]?.account,
      debit: entries[0]?.debit || 0,
      credit: entries[0]?.credit || 0,
    });
  };

  const handleEntryChange = (index: number, field: string, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  useEffect(() => {
    if (isSuccess) navigate('/journal-entries');
  }, [isSuccess, navigate]);

  if (fetchLoading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/journal-entries')} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('accounting.edit')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounting.journalEntries')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('accounting.edit')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="font-semibold">{t("accounting.date")} <span className="text-destructive">*</span></Label>
              <DatePicker value={date} onChange={(d) => setDate(d)} placeholder={t('accounting.selectDate', 'Select date')} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="font-semibold">{t("accounting.description")}</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("accounting.descriptionPlaceholder")} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference" className="font-semibold">{t("accounting.transactionReference")}</Label>
              <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("accounting.transactionReferencePlaceholder")} className="h-10" />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold">{t("accounting.entries")}</Label>
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-4 border rounded-md items-end">
                  <div className="col-span-5 space-y-2">
                    <Label htmlFor={`entry-account-${index}`} className="text-xs">{t("accounting.account")}</Label>
                    <Autocomplete value={entry.account} onChange={(value) => handleEntryChange(index, 'account', value || '')} endpoint="accounts/" labelKey="name" valueKey="id" placeholder={t("accounting.accountPlaceholder")} searchPlaceholder={t("accounting.searchAccounts")} />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor={`entry-debit-${index}`} className="text-xs">{t("accounting.debit")}</Label>
                    <Input id={`entry-debit-${index}`} type="number" min="0" step="0.01" value={entry.debit} onChange={(e) => handleEntryChange(index, 'debit', parseFloat(e.target.value) || 0)} className="h-10" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor={`entry-credit-${index}`} className="text-xs">{t("accounting.credit")}</Label>
                    <Input id={`entry-credit-${index}`} type="number" min="0" step="0.01" value={entry.credit} onChange={(e) => handleEntryChange(index, 'credit', parseFloat(e.target.value) || 0)} className="h-10" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 p-4 bg-muted rounded-md">
              <div className="text-right">
                <p className="text-sm opacity-75">{t("accounting.totalDebit")}</p>
                <p className="text-xl font-bold">{formatNumber(calculateTotalDebit())}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-75">{t("accounting.totalCredit")}</p>
                <p className="text-xl font-bold">{formatNumber(calculateTotalCredit())}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/journal-entries')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? <><RotateCw className="animate-spin mr-2" />{t('common.saving')}</> : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditJournalEntry;
