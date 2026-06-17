import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DatePicker from '@/components/ui/date-picker-calendar';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCw, ArrowLeft, Upload, X, Eye, FileText, Image as ImageIcon, User, MapPin, Phone, File, GraduationCap, CreditCard, Info, DollarSign } from 'lucide-react';
import useAdd from '@/api/useAdd';
import useFetchObjects from '@/api/useFetchObjects';

interface StudentFormData {
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
  transportation: string;
  class_level: string;
  photo?: File | null;
  tazkira_copy?: File | null;
  parent_tazkira_copy?: File | null;
  previous_result_card?: File | null;
  payment_receipt?: File | null;
}

const defaultForm: StudentFormData = {
  full_name: '',
  father_name: '',
  grandfather_name: '',
  date_of_birth: new Date().toISOString().split('T')[0],
  gender: 'male',
  tazkira_number: '',
  permanent_address: '',
  current_address: '',
  province: '',
  district: '',
  area: '',
  parent_phone: '',
  student_phone: '',
  alternative_phone: '',
  email: '',
  registration_number: '',
  registration_date: new Date().toISOString().split('T')[0],
  status: 'active',
  transportation: 'school_bus',
  class_level: '',
  photo: null,
  tazkira_copy: null,
  parent_tazkira_copy: null,
  previous_result_card: null,
  payment_receipt: null,
};

// Static class level options
const CLASS_LEVELS = [
  { id: '1', level: '1', name: 'Class 1' },
  { id: '2', level: '2', name: 'Class 2' },
  { id: '3', level: '3', name: 'Class 3' },
  { id: '4', level: '4', name: 'Class 4' },
  { id: '5', level: '5', name: 'Class 5' },
  { id: '6', level: '6', name: 'Class 6' },
  { id: '7', level: '7', name: 'Class 7' },
  { id: '8', level: '8', name: 'Class 8' },
  { id: '9', level: '9', name: 'Class 9' },
  { id: '10', level: '10', name: 'Class 10' },
  { id: '11', level: '11', name: 'Class 11' },
  { id: '12', level: '12', name: 'Class 12' },
];

const AddStudent = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<StudentFormData>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<{
    photo?: string;
    tazkira_copy?: string;
    parent_tazkira_copy?: string;
    previous_result_card?: string;
    payment_receipt?: string;
  }>({});

  const photoRef = useRef<HTMLInputElement>(null);
  const tazkiraCopyRef = useRef<HTMLInputElement>(null);
  const parentTazkiraCopyRef = useRef<HTMLInputElement>(null);
  const previousResultCardRef = useRef<HTMLInputElement>(null);
  const paymentReceiptRef = useRef<HTMLInputElement>(null);

  const { handleAdd, loading, isSuccess } = useAdd<StudentFormData>({
    queryKey: 'students',
    endpoint: 'students/',
  });

  const classLevels = CLASS_LEVELS;

  useEffect(() => {
    if (isSuccess) {
      navigate('/students');
    }
  }, [isSuccess, navigate]);

  const handleFileChange = (field: keyof typeof previews, file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const clearFile = (field: keyof typeof previews, ref: React.RefObject<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: null }));
    setPreviews((prev) => ({ ...prev, [field]: undefined }));
    if (ref.current) ref.current.value = '';
  };

  const FilePreview = ({ 
    preview, 
    fieldName, 
    onClear,
    isImage = true
  }: { 
    preview?: string; 
    fieldName: string; 
    onClear: () => void;
    isImage?: boolean;
  }) => {
    if (!preview) return null;
    
    return (
      <div className="mt-2 relative inline-block">
        {isImage ? (
          <img 
            src={preview} 
            alt={fieldName} 
            className="h-20 w-20 object-cover rounded-lg border" 
          />
        ) : (
          <div className="h-20 w-20 flex items-center justify-center bg-muted rounded-lg border">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <button
          type="button"
          onClick={onClear}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 shadow-sm"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = t('students.validation.fullName');
    if (!formData.father_name.trim()) newErrors.father_name = t('students.validation.fatherName');
    if (!formData.tazkira_number.trim()) newErrors.tazkira_number = t('students.validation.tazkiraNumber');
    if (!formData.registration_number.trim()) newErrors.registration_number = t('students.validation.registrationNumber');
    if (!formData.registration_date) newErrors.registration_date = t('students.validation.registrationDate');
    if (!formData.parent_phone.trim()) newErrors.parent_phone = t('students.validation.phone');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        submitData.append(key, value as string | Blob);
      }
    });
    
    handleAdd(submitData);
  };

  const FileUploadField = React.forwardRef<HTMLInputElement, { 
    label: string; 
    field: keyof typeof previews; 
    accept?: string;
    icon?: React.ReactNode;
  }>(({ label, field, accept = "image/*,.pdf", icon }, forwardedRef) => (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      <div className="flex items-start gap-3">
        <input
          ref={forwardedRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => (forwardedRef as React.RefObject<HTMLInputElement>).current?.click()}
          className="h-9"
        >
          {icon || <Upload className="h-4 w-4 mr-2" />}
          {t('common.upload', 'Upload')}
        </Button>
        {previews[field] && (
          <FilePreview 
            preview={previews[field]} 
            fieldName={label} 
            onClear={() => clearFile(field, forwardedRef as React.RefObject<HTMLInputElement>)}
            isImage={previews[field]?.startsWith('data:image')}
          />
        )}
      </div>
    </div>
  ));

  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    { value: 'personal', label: t('students.studentInformation'), icon: User },
    { value: 'address', label: t('students.addressInformation'), icon: MapPin },
    { value: 'contact', label: t('students.contactInformation'), icon: Phone },
    { value: 'registration', label: t('students.registrationInformation'), icon: Info },
    { value: 'academic', label: t('students.classFeeInformation'), icon: GraduationCap },
  ];

  const tabIndex = tabs.findIndex(t => t.value === activeTab);
  const canNext = tabIndex < tabs.length - 1;
  const canPrev = tabIndex > 0;

  const handleNext = () => {
    if (canNext) {
      setActiveTab(tabs[tabIndex + 1].value);
    }
  };

  const handlePrev = () => {
    if (canPrev) {
      setActiveTab(tabs[tabIndex - 1].value);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            <h1 className="text-2xl font-bold text-foreground">{t('students.addStudent')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('students.manageStudents')}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="grid w-full min-w-[600px] grid-cols-5">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                <tab.icon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('students.studentInformation')}
              </CardTitle>
              <CardDescription>
                {t('students.studentInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Photo Upload */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors bg-muted/30">
                <div className="relative group">
                  <div 
                    className="h-32 w-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-background"
                    onClick={() => photoRef.current?.click()}
                  >
                    {previews.photo ? (
                      <img src={previews.photo} alt={t('students.photo')} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                        <span className="text-sm text-muted-foreground">{t('students.photo')}</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)}
                  />
                  {previews.photo && (
                    <button
                      type="button"
                      onClick={() => clearFile('photo', photoRef)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 shadow-md transition-transform hover:scale-110"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('students.photo')} (JPG, PNG)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="font-semibold">
                    {t("students.fullName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, full_name: e.target.value }));
                      if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: "" }));
                    }}
                    placeholder={t("students.fullName")}
                    className="h-10"
                  />
                  {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="father_name" className="font-semibold">
                    {t("students.fatherName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="father_name"
                    value={formData.father_name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, father_name: e.target.value }));
                      if (errors.father_name) setErrors((prev) => ({ ...prev, father_name: "" }));
                    }}
                    placeholder={t("students.fatherName")}
                    className="h-10"
                  />
                  {errors.father_name && <p className="text-xs text-destructive">{errors.father_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grandfather_name" className="font-semibold">
                    {t("students.grandfatherName")}
                  </Label>
                  <Input
                    id="grandfather_name"
                    value={formData.grandfather_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, grandfather_name: e.target.value }))}
                    placeholder={t("students.grandfatherName")}
                    className="h-10"
                  />
                </div>

                <DatePicker
                  value={formData.date_of_birth}
                  onChange={(date) => setFormData((prev) => ({ ...prev, date_of_birth: date }))}
                  label={t("students.dateOfBirth")}
                  placeholder={t('students.dateOfBirth', 'تاریخ تولد')}
                />

                <div className="space-y-2">
                  <Label htmlFor="gender" className="font-semibold">
                    {t("students.genderLabel")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t("students.selectGender")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("students.gender.male")}</SelectItem>
                      <SelectItem value="female">{t("students.gender.female")}</SelectItem>
                      <SelectItem value="other">{t("students.gender.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tazkira_number" className="font-semibold">
                    {t("students.tazkiraNumber")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tazkira_number"
                    value={formData.tazkira_number}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tazkira_number: e.target.value }));
                      if (errors.tazkira_number) setErrors((prev) => ({ ...prev, tazkira_number: "" }));
                    }}
                    placeholder={t("students.tazkiraNumber")}
                    className="h-10"
                  />
                  {errors.tazkira_number && <p className="text-xs text-destructive">{errors.tazkira_number}</p>}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="h-10 px-6"
                >
                  {t('common.back', 'Back')}
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!canNext}
                  className="h-10 px-6 bg-primary hover:bg-primary/90"
                >
                  {t('common.next', 'Next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {t('students.addressInformation')}
              </CardTitle>
              <CardDescription>
                {t('students.addressInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="permanent_address" className="font-semibold">
                    {t("students.permanentAddress")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="permanent_address"
                    value={formData.permanent_address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, permanent_address: e.target.value }))}
                    placeholder={t("students.permanentAddress")}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_address" className="font-semibold">
                    {t("students.currentAddress")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="current_address"
                    value={formData.current_address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, current_address: e.target.value }))}
                    placeholder={t("students.currentAddress")}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="province" className="font-semibold">
                    {t("students.province")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData((prev) => ({ ...prev, province: e.target.value }))}
                    placeholder={t("students.province")}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district" className="font-semibold">
                    {t("students.district")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="district"
                    value={formData.district}
                    onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder={t("students.district")}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area" className="font-semibold">
                    {t("students.area")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                    placeholder={t("students.area")}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="h-10 px-6"
                >
                  {t('common.back', 'Back')}
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!canNext}
                  className="h-10 px-6 bg-primary hover:bg-primary/90"
                >
                  {t('common.next', 'Next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                {t('students.contactInformation')}
              </CardTitle>
              <CardDescription>
                {t('students.contactInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="parent_phone" className="font-semibold">
                    {t("students.parentPhone")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="parent_phone"
                    value={formData.parent_phone}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, parent_phone: e.target.value }));
                      if (errors.parent_phone) setErrors((prev) => ({ ...prev, parent_phone: "" }));
                    }}
                    placeholder={t("students.parentPhone")}
                    className="h-10"
                  />
                  {errors.parent_phone && <p className="text-xs text-destructive">{errors.parent_phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student_phone" className="font-semibold">
                    {t("students.studentPhone")}
                  </Label>
                  <Input
                    id="student_phone"
                    value={formData.student_phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, student_phone: e.target.value }))}
                    placeholder={t("students.studentPhone")}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternative_phone" className="font-semibold">
                    {t("students.alternativePhone")}
                  </Label>
                  <Input
                    id="alternative_phone"
                    value={formData.alternative_phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, alternative_phone: e.target.value }))}
                    placeholder={t("students.alternativePhone")}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">
                    {t("students.email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder={t("students.email")}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="h-10 px-6"
                >
                  {t('common.back', 'Back')}
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!canNext}
                  className="h-10 px-6 bg-primary hover:bg-primary/90"
                >
                  {t('common.next', 'Next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {t('students.registrationInformation')}
              </CardTitle>
              <CardDescription>
                {t('students.registrationInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="registration_number" className="font-semibold">
                    {t("students.registrationNumber")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, registration_number: e.target.value }));
                      if (errors.registration_number) setErrors((prev) => ({ ...prev, registration_number: "" }));
                    }}
                    placeholder={t("students.registrationNumber")}
                    className="h-10"
                  />
                  {errors.registration_number && <p className="text-xs text-destructive">{errors.registration_number}</p>}
                </div>

                <DatePicker
                  value={formData.registration_date}
                  onChange={(date) => {
                    setFormData((prev) => ({ ...prev, registration_date: date }));
                    if (errors.registration_date) setErrors((prev) => ({ ...prev, registration_date: "" }));
                  }}
                  label={t("students.registrationDate")}
                  placeholder={t('students.registrationDate', 'تاریخ ثبت نام')}
                />

                <div className="space-y-2">
                  <Label htmlFor="status" className="font-semibold">
                    {t("students.status")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t("students.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("students.statusOptions.active")}</SelectItem>
                      <SelectItem value="inactive">{t("students.statusOptions.inactive")}</SelectItem>
                      <SelectItem value="graduated">{t("students.statusOptions.graduated")}</SelectItem>
                      <SelectItem value="suspended">{t("students.statusOptions.suspended")}</SelectItem>
                      <SelectItem value="transferred">{t("students.statusOptions.transferred")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportation" className="font-semibold">
                    {t("students.transportation")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.transportation}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, transportation: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t("students.selectTransportation")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school_bus">{t("students.transportationOptions.school_bus")}</SelectItem>
                      <SelectItem value="private_vehicle">{t("students.transportationOptions.private_vehicle")}</SelectItem>
                      <SelectItem value="walking">{t("students.transportationOptions.walking")}</SelectItem>
                      <SelectItem value="public_transport">{t("students.transportationOptions.public_transport")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="h-10 px-6"
                >
                  {t('common.back', 'Back')}
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!canNext}
                  className="h-10 px-6 bg-primary hover:bg-primary/90"
                >
                  {t('common.next', 'Next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {t('students.classFeeInformation')}
              </CardTitle>
              <CardDescription>
                {t('students.classFeeInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="class_level" className="font-semibold">
                    {t("students.classLevel")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.class_level}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, class_level: value }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t("students.selectClassLevel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {classLevels.map((cl) => (
                        <SelectItem key={cl.id} value={String(cl.id)}>{cl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fee Info Box */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">{t('students.feeAssignmentNote', 'After registration, fees will be auto-assigned from class defaults')}</p>
                    <p className="text-blue-600 dark:text-blue-300">{t('students.feeAssignmentNote2', 'You can customize fees in Student Fee Assignments after registration')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <File className="h-5 w-5 text-primary" />
                  {t('students.documents')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploadField 
                    label={t("students.tazkiraCopy")} 
                    field="tazkira_copy" 
                    ref={tazkiraCopyRef}
                    icon={<FileText className="h-4 w-4 mr-2" />}
                  />
                  <FileUploadField 
                    label={t("students.parentTazkiraCopy")} 
                    field="parent_tazkira_copy" 
                    ref={parentTazkiraCopyRef}
                    icon={<FileText className="h-4 w-4 mr-2" />}
                  />
                  <FileUploadField 
                    label={t("students.previousResultCard")} 
                    field="previous_result_card" 
                    ref={previousResultCardRef}
                    icon={<FileText className="h-4 w-4 mr-2" />}
                  />
                  <FileUploadField 
                    label={t("students.paymentReceipt")} 
                    field="payment_receipt" 
                    ref={paymentReceiptRef}
                    icon={<FileText className="h-4 w-4 mr-2" />}
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrev} 
                  disabled={!canPrev}
                  className="h-10 px-6"
                >
                  {t('common.back', 'Back')}
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!canNext}
                  className="h-10 px-6 bg-primary hover:bg-primary/90"
                >
                  {t('common.next', 'Next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-4 z-10 bg-background/95 backdrop-blur p-4 rounded-lg border shadow-lg">
        <Button 
          variant="outline" 
          onClick={() => navigate('/students')} 
          disabled={loading}
          className="h-10 px-4 sm:px-6 w-full sm:w-auto"
        >
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="h-10 px-4 sm:px-6 w-full sm:w-auto bg-primary hover:bg-primary/90"
        >
          {loading ? (
            <>
              <RotateCw className="animate-spin mr-2" />
              {t('common.adding')}
            </>
          ) : (
            <>
              <User className="mr-2 h-4 w-4" />
              {t('common.add')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AddStudent;
