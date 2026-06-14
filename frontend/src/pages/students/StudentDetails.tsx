import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObject from '@/api/useFetchObject';
import { useCalendar } from '@/contexts/CalendarContext';
import {
  ArrowLeft,
  Edit,
  Printer,
  RefreshCw,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  Bus,
  IdCard,
  GraduationCap,
  DollarSign,
  ExternalLink,
  Eye,
  Download,
  File,
  Image as ImageIcon,
  Receipt,
  ScrollText,
} from 'lucide-react';

interface FinancialSummary {
  total_fee: string | number;
  total_payments: string | number;
  total_paid: string | number;
  remaining_balance: string | number;
  currency: string;
  class_level?: string | null;
  class_level_id?: number | null;
  by_fee_type?: Record<string, {
    expected: string | number;
    paid: string | number;
    remaining: string | number;
    class_level_id?: number | null;
    class_level_name?: string | null;
  }>;
}

interface Student {
  id: number;
  full_name: string;
  father_name: string;
  grandfather_name?: string;
  date_of_birth: string;
  date_of_birth_shamsi?: {
    year: number;
    month: number;
    day: number;
    formatted: string;
    formatted_long: string;
    month_name_dari: string;
    month_name_pashto: string;
  } | null;
  date_of_birth_qamari?: {
    year: number;
    month: number;
    day: number;
    formatted: string;
    formatted_long: string;
    month_name: string;
  } | null;
  gender: string;
  tazkira_number: string;
  permanent_address: string;
  current_address: string;
  province: string;
  district: string;
  area: string;
  parent_phone: string;
  student_phone?: string;
  alternative_phone?: string;
  email?: string;
  registration_number: string;
  registration_date: string;
  registration_date_shamsi?: {
    year: number;
    month: number;
    day: number;
    formatted: string;
    formatted_long: string;
    month_name_dari: string;
    month_name_pashto: string;
  } | null;
  registration_date_qamari?: {
    year: number;
    month: number;
    day: number;
    formatted: string;
    formatted_long: string;
    month_name: string;
  } | null;
  status: string;
  transportation: string;
  class_level?: {
    id?: number;
    level: string;
    name: string;
  } | null;
  payment_interval_months?: number;
  payment_interval_display?: string;
  currency?: string;
  photo?: string;
  tazkira_copy?: string;
  parent_tazkira_copy?: string;
  previous_result_card?: string;
  payment_receipt?: string;
  age?: number;
  total_fee?: string | number;
  total_paid?: string | number;
  remaining_balance?: string | number;
  financial_summary?: FinancialSummary;
  created_at: string;
  updated_at: string;
}

const docConfig: Record<string, { icon: React.ReactNode; ext: string }> = {
  tazkira_copy: { icon: <IdCard className="h-5 w-5" />, ext: 'PDF' },
  parent_tazkira_copy: { icon: <IdCard className="h-5 w-5" />, ext: 'PDF' },
  previous_result_card: { icon: <ScrollText className="h-5 w-5" />, ext: 'PDF' },
  payment_receipt: { icon: <Receipt className="h-5 w-5" />, ext: 'PDF' },
};

const sectionAccents: Record<string, string> = {
  personal: 'bg-indigo-500',
  address: 'bg-amber-500',
  contact: 'bg-emerald-500',
  registration: 'bg-rose-500',
  documents: 'bg-slate-500',
};

const StudentDetails = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: student, isLoading } = useFetchObject<Student>({
    queryKey: ['student', id],
    endpoint: `students/${id}/`,
  });

  const { calendarType } = useCalendar();

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      graduated: 'bg-blue-100 text-blue-800 border-blue-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      transferred: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusDot = (status: string) => {
    const dots: Record<string, string> = {
      active: 'bg-emerald-500',
      inactive: 'bg-gray-400',
      graduated: 'bg-blue-500',
      suspended: 'bg-red-500',
      transferred: 'bg-amber-500',
    };
    return dots[status] || 'bg-gray-400';
  };

  const getGenderLabel = (gender: string) => {
    const labels: Record<string, string> = {
      male: t('students.gender.male'),
      female: t('students.gender.female'),
      other: t('students.gender.other'),
    };
    return labels[gender] || gender;
  };

  const getTransportationLabel = (transportation: string) => {
    const labels: Record<string, string> = {
      school_bus: t('students.transportationOptions.school_bus'),
      private_vehicle: t('students.transportationOptions.private_vehicle'),
      walking: t('students.transportationOptions.walking'),
      public_transport: t('students.transportationOptions.public_transport'),
    };
    return labels[transportation] || transportation;
  };

  const getPaymentIntervalLabel = (interval: number) => {
    const labels: Record<number, string> = {
      1: t('students.paymentIntervalMonths.monthly'),
      2: t('students.paymentIntervalMonths.bimonthly'),
      3: t('students.paymentIntervalMonths.quarterly'),
      4: t('students.paymentIntervalMonths.every4'),
      5: t('students.paymentIntervalMonths.every5'),
      6: t('students.paymentIntervalMonths.every6'),
      12: t('students.paymentIntervalMonths.yearly'),
    };
    return labels[interval] || t('students.paymentIntervalMonths.custom');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: string | number | undefined) => {
    const val = typeof amount === 'string' ? parseFloat(amount) || 0 : (amount ?? 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AFN',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const getFileTypeIcon = (url?: string) => {
    if (!url) return <FileText className="h-5 w-5" />;
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center text-muted-foreground py-20">
          {t('students.noStudentsFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl print:py-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/students')}
            className="rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {student.registration_number}
              </span>
              <Badge className={`${getStatusColor(student.status)} border`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(student.status)}`} />
                {t(`students.statusOptions.${student.status}`, student.status)}
              </Badge>
            </div>
            <h1 className="text-xl font-bold mt-1">{student.full_name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            {t('common.print', 'Print')}
          </Button>
          <Button onClick={() => navigate(`/students/${id}/edit`)} className="gap-2">
            <Edit className="h-4 w-4" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      {/* ── Print Header ── */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-primary pb-4">
        <h1 className="text-2xl font-bold text-primary">Noor Ul-Falah</h1>
        <p className="text-sm text-muted-foreground">Management Information System</p>
        <h2 className="text-lg font-semibold mt-4">Student Registration Form</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ════════════════════════ LEFT COLUMN ════════════════════════ */}
        <div className="space-y-6">
          {/* ── Photo Card ── */}
          <Card className="overflow-hidden border-t-4 border-t-primary">
            <div className="aspect-[3/4] bg-gradient-to-b from-muted/80 to-muted flex items-center justify-center relative">
              {student.photo ? (
                <img
                  src={student.photo}
                  alt={student.full_name}
                  className="w-full h-full object-cover absolute inset-0"
                />
              ) : (
                <User className="h-20 w-20 text-muted-foreground/30" />
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
                <h3 className="text-white text-lg font-bold leading-tight">{student.full_name}</h3>
                <p className="text-white/80 text-xs font-mono mt-0.5">{student.registration_number}</p>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('students.status')}</span>
                <Badge className={`${getStatusColor(student.status)} border text-xs`}>
                  {t(`students.statusOptions.${student.status}`, student.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ── Financial Summary ── */}
          <Card className="border-t-4 border-t-emerald-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                {t('students.financialSummary', 'Financial Summary')}
              </CardTitle>
              {student.class_level && (
                <div className="text-xs text-muted-foreground">
                  {t('students.classLevel', 'Class')}: {student.class_level.name}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('students.totalFee', 'Total Fee')}
                  </div>
                  <div className="text-sm font-bold text-blue-600">
                    {formatCurrency(student.financial_summary?.total_fee || student.total_fee || 0)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('students.totalPaid', 'Total Paid')}
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    {formatCurrency(student.financial_summary?.total_payments || student.total_paid || 0)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('students.remainingBalance', 'Remaining')}
                  </div>
                  <div className="text-sm font-bold text-red-600">
                    {formatCurrency(student.financial_summary?.remaining_balance || student.remaining_balance || 0)}
                  </div>
                </div>
              </div>

              {/* Fee Breakdown by Type */}
              {student.financial_summary?.by_fee_type && Object.keys(student.financial_summary.by_fee_type).length > 0 && (
                <div className="border-t pt-3 mt-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('students.feeBreakdown', 'Fee Breakdown')}
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(student.financial_summary.by_fee_type).map(([feeName, data]: [string, any]) => (
                      <div key={feeName} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                        <span className="text-muted-foreground font-medium">{feeName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 font-semibold">{formatCurrency(data.paid)}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-bold">{formatCurrency(data.expected)}</span>
                          {parseFloat(String(data.remaining || 0)) > 0 && (
                            <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                              {formatCurrency(data.remaining)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-3 mt-2 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => navigate(`/student-fee-assignments?student=${student.id}`)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {t('students.manageFeeAssignments', 'Manage Fees')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => navigate(`/student-payments/add?student=${student.id}`)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {t('student-payments.addPayment', 'Add Payment')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ════════════════════════ RIGHT COLUMN ════════════════════════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Personal Information ── */}
          <Card className="border-t-4 border-t-indigo-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                {t('students.studentInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow
                  label={t('students.fullName')}
                  value={student.full_name}
                  accentDot="bg-indigo-400"
                />
                <InfoRow
                  label={t('students.fatherName')}
                  value={student.father_name}
                  accentDot="bg-indigo-400"
                />
                {student.grandfather_name && (
                  <InfoRow
                    label={t('students.grandfatherName')}
                    value={student.grandfather_name}
                    accentDot="bg-indigo-400"
                  />
                )}
                <InfoRow
                  label={t('students.dateOfBirth')}
                  value={
                    <div className="space-y-0.5">
                      {calendarType === 'shamsi' && student.date_of_birth_shamsi && (
                        <span className="text-sm">{student.date_of_birth_shamsi.formatted}</span>
                      )}
                      {calendarType === 'qamari' && student.date_of_birth_qamari && (
                        <span className="text-sm">{student.date_of_birth_qamari.formatted}</span>
                      )}
                    </div>
                  }
                  accentDot="bg-indigo-400"
                />
                {student.age && (
                  <InfoRow
                    label={t('students.age', 'Age')}
                    value={`${student.age} years`}
                    accentDot="bg-indigo-400"
                  />
                )}
                <InfoRow
                  label={t('students.genderLabel')}
                  value={getGenderLabel(student.gender)}
                  accentDot="bg-indigo-400"
                />
                <div className="col-span-2">
                  <InfoRow
                    label={t('students.tazkiraNumber')}
                    value={student.tazkira_number}
                    accentDot="bg-indigo-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Address Information ── */}
          <Card className="border-t-4 border-t-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-600" />
                {t('students.addressInformation', 'Address Information')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <InfoRow
                    label={t('students.permanentAddress')}
                    value={student.permanent_address}
                    accentDot="bg-amber-400"
                  />
                </div>
                <div className="col-span-2">
                  <InfoRow
                    label={t('students.currentAddress')}
                    value={student.current_address}
                    accentDot="bg-amber-400"
                  />
                </div>
                <InfoRow
                  label={t('students.province')}
                  value={student.province}
                  accentDot="bg-amber-400"
                />
                <InfoRow
                  label={t('students.district')}
                  value={student.district}
                  accentDot="bg-amber-400"
                />
                <div className="col-span-2">
                  <InfoRow
                    label={t('students.area')}
                    value={student.area}
                    accentDot="bg-amber-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Contact Information ── */}
          <Card className="border-t-4 border-t-emerald-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                {t('students.contactInformation', 'Contact Information')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <InfoRow
                    label={t('students.parentPhone')}
                    value={student.parent_phone}
                    accentDot="bg-emerald-400"
                  />
                </div>
                {student.student_phone && (
                  <div className="col-span-2 sm:col-span-1">
                    <InfoRow
                      label={t('students.studentPhone')}
                      value={student.student_phone}
                      accentDot="bg-emerald-400"
                    />
                  </div>
                )}
                {student.alternative_phone && (
                  <div className="col-span-2 sm:col-span-1">
                    <InfoRow
                      label={t('students.alternativePhone')}
                      value={student.alternative_phone}
                      accentDot="bg-emerald-400"
                    />
                  </div>
                )}
                {student.email && (
                  <div className="col-span-2">
                    <InfoRow
                      label={t('students.email')}
                      value={student.email}
                      accentDot="bg-emerald-400"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Registration Information ── */}
          <Card className="border-t-4 border-t-rose-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-rose-600" />
                {t('students.registrationInformation', 'Registration Information')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow
                  label={t('students.classLevel')}
                  value={
                    student.class_level ? (
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                        {student.class_level.name}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                  accentDot="bg-rose-400"
                />
                <InfoRow
                  label={t('students.paymentInterval')}
                  value={
                    <Badge variant="outline" className="text-xs">
                      {student.payment_interval_display || getPaymentIntervalLabel(student.payment_interval_months || 1)}
                    </Badge>
                  }
                  accentDot="bg-rose-400"
                />
                <InfoRow
                  label={t('students.feeCurrency')}
                  value={
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                      {student.currency || 'AFN'}
                    </span>
                  }
                  accentDot="bg-rose-400"
                />
                <InfoRow
                  label={t('students.registrationNumber')}
                  value={<span className="font-mono text-xs">{student.registration_number}</span>}
                  accentDot="bg-rose-400"
                />
                <InfoRow
                  label={t('students.registrationDate')}
                  value={
                    <div className="space-y-0.5">
                      {calendarType === 'shamsi' && student.registration_date_shamsi && (
                        <span className="text-sm">{student.registration_date_shamsi.formatted}</span>
                      )}
                      {calendarType === 'qamari' && student.registration_date_qamari && (
                        <span className="text-sm">{student.registration_date_qamari.formatted}</span>
                      )}
                    </div>
                  }
                  accentDot="bg-rose-400"
                />
                <InfoRow
                  label={t('students.status')}
                  value={
                    <Badge className={`${getStatusColor(student.status)} border text-xs`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusDot(student.status)}`} />
                      {t(`students.statusOptions.${student.status}`, student.status)}
                    </Badge>
                  }
                  accentDot="bg-rose-400"
                />
                <div className="col-span-2">
                  <InfoRow
                    label={t('students.transportation')}
                    value={getTransportationLabel(student.transportation)}
                    accentDot="bg-rose-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Documents ── */}
          <Card className="border-t-4 border-t-slate-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" />
                {t('students.documents', 'Documents')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <DocRow
                  label={t('students.tazkiraCopy')}
                  url={student.tazkira_copy}
                  config={docConfig.tazkira_copy}
                  viewText={t('common.view', 'View')}
                  notUploadedText={t('common.notUploaded', 'Not Uploaded')}
                  previewText={t('common.preview', 'Preview')}
                  downloadText={t('common.download', 'Download')}
                  previewOpen={previewOpen}
                  onPreviewOpen={setPreviewOpen}
                  onPreviewUrl={setPreviewUrl}
                  t={t}
                />
                <DocRow
                  label={t('students.parentTazkiraCopy')}
                  url={student.parent_tazkira_copy}
                  config={docConfig.parent_tazkira_copy}
                  viewText={t('common.view', 'View')}
                  notUploadedText={t('common.notUploaded', 'Not Uploaded')}
                  previewText={t('common.preview', 'Preview')}
                  downloadText={t('common.download', 'Download')}
                  previewOpen={previewOpen}
                  onPreviewOpen={setPreviewOpen}
                  onPreviewUrl={setPreviewUrl}
                  t={t}
                />
                <DocRow
                  label={t('students.previousResultCard')}
                  url={student.previous_result_card}
                  config={docConfig.previous_result_card}
                  viewText={t('common.view', 'View')}
                  notUploadedText={t('common.notUploaded', 'Not Uploaded')}
                  previewText={t('common.preview', 'Preview')}
                  downloadText={t('common.download', 'Download')}
                  previewOpen={previewOpen}
                  onPreviewOpen={setPreviewOpen}
                  onPreviewUrl={setPreviewUrl}
                  t={t}
                />
                <DocRow
                  label={t('students.paymentReceipt')}
                  url={student.payment_receipt}
                  config={docConfig.payment_receipt}
                  viewText={t('common.view', 'View')}
                  notUploadedText={t('common.notUploaded', 'Not Uploaded')}
                  previewText={t('common.preview', 'Preview')}
                  downloadText={t('common.download', 'Download')}
                  previewOpen={previewOpen}
                  onPreviewOpen={setPreviewOpen}
                  onPreviewUrl={setPreviewUrl}
                  t={t}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Print Footer ── */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
        <p>
          Generated on:{' '}
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <p className="mt-1">Noor Ul-Falah Management Information System</p>
      </div>

      {/* ── Preview Dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('students.documentsPreview', 'Document preview')}
            </DialogTitle>
            <DialogDescription>
              {previewUrl}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/30">
            <iframe
              src={`${previewUrl || ''}#toolbar=0&navpanes=0&scrollbar=1`}
              title="Document preview"
              className="w-full h-[65vh]"
              style={{ border: 'none' }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              className="gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('common.view', 'View')}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => previewUrl && window.open(previewUrl, '_blank')}
              className="gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              {t('common.download', 'Download')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─────────────────────────────── Helpers ───────────────────────────────

// Thin field: one-line label + value with subtle accent dot
const InfoRow = ({
  label,
  value,
  accentDot,
}: {
  label: string;
  value?: string | React.ReactNode;
  accentDot: string;
}) => (
  <div className="flex items-start gap-2.5 group">
    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${accentDot}`} />
    <div className="min-w-0 flex-1">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="text-sm font-medium text-foreground mt-0.5 break-words">
        {value || <span className="text-muted-foreground/60 italic">—</span>}
      </div>
    </div>
  </div>
);

// Document row — icon left, label centre, actions right
const DocRow = ({
  label,
  url,
  config,
  viewText,
  notUploadedText,
  previewText,
  downloadText,
  previewOpen,
  onPreviewOpen,
  onPreviewUrl,
  t,
}: {
  label: string;
  url?: string;
  config: { icon: React.ReactNode; ext: string };
  viewText: string;
  notUploadedText: string;
  previewText: string;
  downloadText: string;
  previewOpen: boolean;
  onPreviewOpen: (open: boolean) => void;
  onPreviewUrl: (url: string | null) => void;
  t: (key: string, fallback?: string) => string;
}) => {
  if (!url) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 bg-muted/40 rounded-xl border border-dashed border-muted-foreground/20">
        {config.icon}
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="ml-auto text-xs text-muted-foreground/60">{notUploadedText}</span>
      </div>
    );
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i.test(url);
  const extLabel = getFileExtLabel(url);

  if (isImage) {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5 bg-muted/40 rounded-xl">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {extLabel && (
              <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {extLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => { onPreviewUrl(url); onPreviewOpen(true); }}
            className="mt-2 block h-16 w-16 rounded-lg border bg-background overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img src={url} alt={label} className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center px-4 py-3.5 bg-muted/40 rounded-xl gap-3">
      <div className="shrink-0">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{label}</span>
          {extLabel && (
            <span
              className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                extLabel === 'PDF'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}
            >
              {extLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={() => { onPreviewUrl(url); onPreviewOpen(true); }}
          className="h-8 gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          {previewText}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => window.open(url, '_blank')}
          className="h-8 w-8 p-0"
          title={viewText}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          asChild
          className="h-8 w-8 p-0"
          title={downloadText}
        >
          <a href={url} download>
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
};

function getFileExtLabel(url?: string): string | null {
  if (!url) return null;
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) {
    return 'IMAGE';
  }
  if (ext === 'pdf') return 'PDF';
  if (ext) return ext.toUpperCase();
  return null;
}

export default StudentDetails;
