import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Autocomplete } from '@/components/ui/autocomplete';
import { DatePicker } from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, FileText, Plus, X } from 'lucide-react';
import useAdd from '@/api/useAdd';
import { formatNumber } from '@/lib/formatNumber';
import { toNumberOr } from '@/lib/digits';

const AddJournalEntry = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [entries, setEntries] = useState([
    { account: '', debit: '' as string | number, credit: '' as string | number },
    { account: '', debit: '' as string | number, credit: '' as string | number },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { handleAdd, loading, isSuccess } = useAdd({
    queryKey: ['transactions'],
    endpoint: 'transactions/',
  });

  const calculateTotalDebit = () => entries.reduce((sum, e) => sum + toNumberOr(e.debit), 0);
  const calculateTotalCredit = () => entries.reduce((sum, e) => sum + toNumberOr(e.credit), 0);
  const isBalanced = calculateTotalDebit() === calculateTotalCredit();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = t('validation.required');
    if (!isBalanced) newErrors.balance = t('accounting.transactionNotBalanced');
    if (entries.some(e => !e.account)) newErrors.accounts = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    const transactionData = {
      date,
      description,
      reference,
      transaction_type: 'journal',
      entries: entries.map(e => ({
        account: parseInt(String(e.account), 10),
        debit: toNumberOr(e.debit),
        credit: toNumberOr(e.credit),
      })),
    };
    
    handleAdd(transactionData);
  };

  const handleEntryChange = (index: number, field: string, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const addEntry = () => {
    setEntries([...entries, { account: '', debit: '', credit: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  React.useEffect(() => {
    if (isSuccess) navigate('/journal-entries');
  }, [isSuccess, navigate]);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/journal-entries')} className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('accounting.journalEntries')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounting.doubleEntryBookkeeping')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t('accounting.addTransaction')}
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
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">{t("accounting.entries")}</Label>
              <Button variant="outline" size="sm" onClick={addEntry} className="gap-1">
                <Plus className="h-4 w-4" /> {t("accounting.addEntry")}
              </Button>
            </div>

            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-4 border rounded-md items-end">
                  <div className="col-span-5 space-y-2">
                    <Label htmlFor={`entry-account-${index}`} className="text-xs">{t("accounting.account")}</Label>
                    <Autocomplete value={entry.account} onChange={(value) => handleEntryChange(index, 'account', value || '')} endpoint="accounts/" labelKey="name" valueKey="id" placeholder={t("accounting.accountPlaceholder")} searchPlaceholder={t("accounting.searchAccounts")} />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor={`entry-debit-${index}`} className="text-xs">{t("accounting.debit")}</Label>
                    <NumericInput maxDecimals={2} id={`entry-debit-${index}`} value={entry.debit} onValueChange={(v) => handleEntryChange(index, 'debit', v)} className="h-10" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor={`entry-credit-${index}`} className="text-xs">{t("accounting.credit")}</Label>
                    <NumericInput maxDecimals={2} id={`entry-credit-${index}`} value={entry.credit} onValueChange={(v) => handleEntryChange(index, 'credit', v)} className="h-10" />
                  </div>
                  {entries.length > 2 && (
                    <div className="col-span-1">
                      <Button variant="ghost" size="sm" onClick={() => removeEntry(index)} className="text-red-600 h-10"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
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

            {errors.balance && <div className="p-4 bg-red-100 text-red-800 rounded-md text-sm">{errors.balance}</div>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/journal-entries')} disabled={loading} className="h-10 px-6">{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-10 px-6">
              {loading ? <><RotateCw className="animate-spin mr-2" />{t('common.adding')}</> : t('common.add')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddJournalEntry;
