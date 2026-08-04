import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DatePicker from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  RotateCw,
  ArrowLeft,
  X,
  Image as ImageIcon,
  User,
  MapPin,
  Phone,
  File,
  Info,
  GraduationCap,
} from 'lucide-react';
import {
  StudentDocumentUploadField,
  STUDENT_DOCUMENT_FIELDS,
  StudentDocumentField,
} from '@/components/students/StudentDocumentUploadField';

export interface StudentFormData {
  full_name: string;
  father_name: string;
  grandfather_name?: string;
  date_of_birth: string;
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
  status: string;
  fee_type: string;
  transportation: string;
  class_level: string;
  photo?: File | null;
  tazkira_copy?: File | null;
  parent_tazkira_copy?: File | null;
  previous_result_card?: File | null;
  payment_receipt?: File | null;
}

export interface ExistingFiles {
  photo?: string;
  tazkira_copy?: string;
  parent_tazkira_copy?: string;
  previous_result_card?: string;
  payment_receipt?: string;
}

const CLASS_LEVELS = [
  { id: 'KG', level: '0', name: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    level: String(i + 1),
    name: `Class ${i + 1}`,
  })),
];

interface StudentFormProps {
  mode: 'add' | 'edit';
  formData: StudentFormData;
  errors: Record<string, string>;
  previews: Partial<Record<StudentDocumentField | 'photo', string>>;
  existingFiles?: ExistingFiles;
  loading: boolean;
  onFieldChange: <K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) => void;
  onClearError: (key: string) => void;
  onFileChange: (field: StudentDocumentField | 'photo', file: File | null) => void;
  onClearFile: (field: StudentDocumentField | 'photo') => void;
  onSubmit: (e: React.FormEvent) => void;
}

const FormSection = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <div className="space-y-4 pt-2">
    <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </h3>
    {children}
  </div>
);

export const StudentForm: React.FC<StudentFormProps> = ({
  mode,
  formData,
  errors,
  previews,
  existingFiles = {},
  loading,
  onFieldChange,
  onClearError,
  onFileChange,
  onClearFile,
  onSubmit,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = React.useState(1);

  const isAdd = mode === 'add';
  const title = isAdd ? t('students.addStudent') : t('students.editStudent');
  const description = isAdd
    ? t('students.addStudentDesc', 'Register a new student')
    : t('students.editStudentDesc', 'Update student information');
  const cardTitle = t('students.studentDetails', 'Student Details');

  const totalSteps = 5;
  const steps = [
    { number: 1, title: t('students.studentInformation') },
    { number: 2, title: t('students.addressInformation') },
    { number: 3, title: t('students.contactInformation') },
    { number: 4, title: t('students.registrationInformation') },
    { number: 5, title: t('students.documents') },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // Save current step data before moving to next step
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          submitData.append(key, value as string | Blob);
        }
      });
      // Trigger save without validation
      if (onSubmit) {
        const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
        onSubmit(dummyEvent);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNumber: number) => {
    setCurrentStep(stepNumber);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    // Save without validation - just submit what we have
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        submitData.append(key, value as string | Blob);
      }
    });
    onSubmit(e);
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/students')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{t('students.manageStudents')}</p>
          </div>
        </div>
      </div>

      {/* Step Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-center cursor-pointer"
              onClick={() => handleStepClick(step.number)}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
                  currentStep >= step.number
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                {step.number}
              </div>
              {step.number < totalSteps && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    currentStep > step.number ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step) => (
            <span
              key={step.number}
              className={`text-xs ${
                currentStep === step.number
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            {cardTitle}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <FormSection title={t('students.studentInformation')} icon={User}>
                <div className="flex flex-col items-center p-4 border border-dashed border-border/60 rounded-lg bg-muted/20">
                  <div className="relative">
                    <div
                      className="h-28 w-28 rounded-full border border-border/60 flex items-center justify-center cursor-pointer overflow-hidden bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        photoRef.current?.click();
                      }}
                    >
                      {previews.photo || existingFiles.photo ? (
                        <img
                          src={previews.photo || existingFiles.photo}
                          alt={t('students.photo')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
                          <span className="text-xs text-muted-foreground">{t('students.photo')}</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFileChange('photo', e.target.files?.[0] || null);
                      }}
                    />
                    {(previews.photo || existingFiles.photo) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearFile('photo');
                        }}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="font-semibold">
                      {t('students.fullName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => {
                        onFieldChange('full_name', e.target.value);
                        onClearError('full_name');
                      }}
                      placeholder={t('students.fullName')}
                      className="h-10"
                    />
                    {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="father_name" className="font-semibold">
                      {t('students.fatherName')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="father_name"
                      value={formData.father_name}
                      onChange={(e) => {
                        onFieldChange('father_name', e.target.value);
                        onClearError('father_name');
                      }}
                      placeholder={t('students.fatherName')}
                      className="h-10"
                    />
                    {errors.father_name && <p className="text-xs text-destructive">{errors.father_name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grandfather_name" className="font-semibold">
                      {t('students.grandfatherName')}
                    </Label>
                    <Input
                      id="grandfather_name"
                      value={formData.grandfather_name}
                      onChange={(e) => onFieldChange('grandfather_name', e.target.value)}
                      placeholder={t('students.grandfatherName')}
                      className="h-10"
                    />
                  </div>

                  <DatePicker
                    value={formData.date_of_birth}
                    onChange={(date) => onFieldChange('date_of_birth', date)}
                    label={t('students.dateOfBirth')}
                    placeholder={t('students.dateOfBirth')}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="gender" className="font-semibold">
                      {t('students.genderLabel')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.gender} onValueChange={(value) => onFieldChange('gender', value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('students.selectGender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('students.gender.male')}</SelectItem>
                        <SelectItem value="female">{t('students.gender.female')}</SelectItem>
                        <SelectItem value="other">{t('students.gender.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tazkira_number" className="font-semibold">
                      {t('students.tazkiraNumber')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="tazkira_number"
                      value={formData.tazkira_number}
                      onChange={(e) => {
                        onFieldChange('tazkira_number', e.target.value);
                        onClearError('tazkira_number');
                      }}
                      placeholder={t('students.tazkiraNumber')}
                      className="h-10"
                    />
                    {errors.tazkira_number && <p className="text-xs text-destructive">{errors.tazkira_number}</p>}
                  </div>
                </div>
              </FormSection>
            )}

            {/* Step 2: Address Information */}
            {currentStep === 2 && (
              <FormSection title={t('students.addressInformation')} icon={MapPin}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="permanent_address" className="font-semibold">
                      {t('students.permanentAddress')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="permanent_address"
                      value={formData.permanent_address}
                      onChange={(e) => onFieldChange('permanent_address', e.target.value)}
                      placeholder={t('students.permanentAddress')}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_address" className="font-semibold">
                      {t('students.currentAddress')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="current_address"
                      value={formData.current_address}
                      onChange={(e) => onFieldChange('current_address', e.target.value)}
                      placeholder={t('students.currentAddress')}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province" className="font-semibold">
                      {t('students.province')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => onFieldChange('province', e.target.value)}
                      placeholder={t('students.province')}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district" className="font-semibold">
                      {t('students.district')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => onFieldChange('district', e.target.value)}
                      placeholder={t('students.district')}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="area" className="font-semibold">
                      {t('students.area')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => onFieldChange('area', e.target.value)}
                      placeholder={t('students.area')}
                      className="h-10"
                    />
                  </div>
                </div>
              </FormSection>
            )}

            {/* Step 3: Contact Information */}
            {currentStep === 3 && (
              <FormSection title={t('students.contactInformation')} icon={Phone}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="parent_phone" className="font-semibold">
                      {t('students.parentPhone')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="parent_phone"
                      value={formData.parent_phone}
                      onChange={(e) => {
                        onFieldChange('parent_phone', e.target.value);
                        onClearError('parent_phone');
                      }}
                      placeholder={t('students.parentPhone')}
                      className="h-10"
                    />
                    {errors.parent_phone && <p className="text-xs text-destructive">{errors.parent_phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student_phone" className="font-semibold">
                      {t('students.studentPhone')}
                    </Label>
                    <Input
                      id="student_phone"
                      value={formData.student_phone}
                      onChange={(e) => onFieldChange('student_phone', e.target.value)}
                      placeholder={t('students.studentPhone')}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alternative_phone" className="font-semibold">
                      {t('students.alternativePhone')}
                    </Label>
                    <Input
                      id="alternative_phone"
                      value={formData.alternative_phone}
                      onChange={(e) => onFieldChange('alternative_phone', e.target.value)}
                      placeholder={t('students.alternativePhone')}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">
                      {t('students.email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => onFieldChange('email', e.target.value)}
                      placeholder={t('students.email')}
                      className="h-10"
                    />
                  </div>
                </div>
              </FormSection>
            )}

            {/* Step 4: Registration Information */}
            {currentStep === 4 && (
              <FormSection title={t('students.registrationInformation')} icon={Info}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="registration_number" className="font-semibold">
                      {t('students.registrationNumber')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="registration_number"
                      value={formData.registration_number}
                      onChange={(e) => {
                        onFieldChange('registration_number', e.target.value);
                        onClearError('registration_number');
                      }}
                      placeholder={t('students.registrationNumber')}
                      className="h-10"
                    />
                    {errors.registration_number && (
                      <p className="text-xs text-destructive">{errors.registration_number}</p>
                    )}
                  </div>

                  <DatePicker
                    value={formData.registration_date}
                    onChange={(date) => {
                      onFieldChange('registration_date', date);
                      onClearError('registration_date');
                    }}
                    label={t('students.registrationDate')}
                    placeholder={t('students.registrationDate')}
                  />
                  {errors.registration_date && (
                    <p className="text-xs text-destructive sm:col-span-2">{errors.registration_date}</p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="status" className="font-semibold">
                      {t('students.status')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => onFieldChange('status', value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('students.selectStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('students.statusOptions.active')}</SelectItem>
                        <SelectItem value="inactive">{t('students.statusOptions.inactive')}</SelectItem>
                        <SelectItem value="graduated">{t('students.statusOptions.graduated')}</SelectItem>
                        <SelectItem value="suspended">{t('students.statusOptions.suspended')}</SelectItem>
                        <SelectItem value="transferred">{t('students.statusOptions.transferred')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fee_type" className="font-semibold">
                      {t('students.feeType', 'Fee Type')} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.fee_type} onValueChange={(value) => onFieldChange('fee_type', value)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('students.selectFeeType', 'Select Fee Type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">{t('students.feeTypeOptions.paid', 'Paid Student')}</SelectItem>
                        <SelectItem value="free">{t('students.feeTypeOptions.free', 'Free Student')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transportation" className="font-semibold">
                      {t('students.transportation')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.transportation}
                      onValueChange={(value) => onFieldChange('transportation', value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('students.selectTransportation')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school_bus">{t('students.transportationOptions.school_bus')}</SelectItem>
                        <SelectItem value="private_vehicle">
                          {t('students.transportationOptions.private_vehicle')}
                        </SelectItem>
                        <SelectItem value="walking">{t('students.transportationOptions.walking')}</SelectItem>
                        <SelectItem value="public_transport">
                          {t('students.transportationOptions.public_transport')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="class_level" className="font-semibold">
                      {t('students.classLevel')} <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.class_level}
                      onValueChange={(value) => onFieldChange('class_level', value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('students.selectClassLevel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_LEVELS.map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>
                            {t(`students.classLevels.${cl.id}`, cl.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isAdd && (
                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">{t('students.feeAssignmentNote')}</p>
                    <p>{t('students.feeAssignmentNote2')}</p>
                  </div>
                )}
              </FormSection>
            )}

            {/* Step 5: Documents */}
            {currentStep === 5 && (
              <FormSection title={t('students.documents')} icon={File}>
                <p className="text-sm text-muted-foreground">{t('students.documentsDescription')}</p>
                <div className="grid grid-cols-1 gap-4">
                  {STUDENT_DOCUMENT_FIELDS.map(({ field, labelKey, descriptionKey }) => (
                    <StudentDocumentUploadField
                      key={field}
                      label={t(labelKey)}
                      description={descriptionKey ? t(descriptionKey) : undefined}
                      file={formData[field]}
                      preview={previews[field]}
                      existingUrl={existingFiles[field]}
                      onChange={(file) => onFileChange(field, file)}
                      onClear={() => onClearFile(field)}
                    />
                  ))}
                </div>
              </FormSection>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/students')}
                  disabled={loading}
                  className="h-10 px-6"
                >
                  {t('common.cancel')}
                </Button>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={loading}
                    className="h-10 px-6"
                  >
                    {t('common.previous', 'Previous')}
                  </Button>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                {currentStep < totalSteps ? (
                  <>
                    {/* Save button for all steps in edit mode */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        // Save current step data
                        const submitData = new FormData();
                        Object.entries(formData).forEach(([key, value]) => {
                          if (value !== null && value !== undefined && value !== '') {
                            submitData.append(key, value as string | Blob);
                          }
                        });
                        onSubmit(e as unknown as React.FormEvent);
                      }}
                      disabled={loading}
                      className="h-10 px-6"
                    >
                      {loading ? (
                        <>
                          <RotateCw className="animate-spin mr-2 h-4 w-4" />
                          {t('common.saving', 'Saving...')}
                        </>
                      ) : (
                        t('common.save', 'Save')
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={loading}
                      className="h-10 px-6"
                    >
                      {t('common.next', 'Next')}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Save button - always enabled, doesn't require validation */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        // Save without validation
                        const submitData = new FormData();
                        Object.entries(formData).forEach(([key, value]) => {
                          if (value !== null && value !== undefined && value !== '') {
                            submitData.append(key, value as string | Blob);
                          }
                        });
                        onSubmit(e as unknown as React.FormEvent);
                      }}
                      disabled={loading}
                      className="h-10 px-6"
                    >
                      {loading ? (
                        <>
                          <RotateCw className="animate-spin mr-2 h-4 w-4" />
                          {t('common.saving', 'Saving...')}
                        </>
                      ) : (
                        t('common.save', 'Save')
                      )}
                    </Button>
                    {/* Update button - requires validation */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-10 px-6"
                    >
                      {loading ? (
                        <>
                          <RotateCw className="animate-spin mr-2 h-4 w-4" />
                          {isAdd ? t('common.adding') : t('common.updating')}
                        </>
                      ) : isAdd ? (
                        t('common.add')
                      ) : (
                        t('common.update')
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
