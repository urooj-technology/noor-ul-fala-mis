import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 10;

export type StudentDocumentField =
  | 'tazkira_copy'
  | 'parent_tazkira_copy'
  | 'previous_result_card'
  | 'payment_receipt';

interface StudentDocumentUploadFieldProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  accept?: string;
  preview?: string;
  existingUrl?: string;
  file?: File | null;
  onChange: (file: File | null) => void;
  onClear: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageUrl(url: string): boolean {
  return url.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

function getExtension(nameOrUrl: string): string {
  const match = nameOrUrl.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match ? match[1].toUpperCase() : '';
}

export function StudentDocumentUploadField({
  label,
  description,
  icon,
  accept = 'image/*,.pdf',
  preview,
  existingUrl,
  file,
  onChange,
  onClear,
}: StudentDocumentUploadFieldProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview || existingUrl;
  const hasFile = Boolean(file || displayUrl);
  const displayName = file?.name || (existingUrl ? label : '');
  const displaySize = file ? formatFileSize(file.size) : '';
  const ext = file ? getExtension(file.name) : existingUrl ? getExtension(existingUrl) : '';
  const showImage = displayUrl && isImageUrl(displayUrl);

  const validateAndSet = useCallback(
    (nextFile: File | null) => {
      setError(null);
      if (!nextFile) {
        onChange(null);
        return;
      }
      if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(t('students.maxFileSize', `Maximum file size is ${MAX_FILE_SIZE_MB} MB`));
        return;
      }
      onChange(nextFile);
    },
    [onChange, t],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSet(e.target.files?.[0] || null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    validateAndSet(e.dataTransfer.files?.[0] || null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {hasFile && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
            {t('students.uploaded', 'Uploaded')}
          </span>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : hasFile
              ? 'border-border bg-muted/30'
              : 'border-muted-foreground/25 bg-muted/20 hover:border-primary/50 hover:bg-muted/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            e.stopPropagation();
            validateAndSet(e.target.files?.[0] || null);
          }}
        />

        {!hasFile ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="w-full flex flex-col items-center justify-center gap-3 px-4 py-8 text-center"
          >
            <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center text-muted-foreground">
              {icon || <Upload className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('students.dragDropOrClick', 'Drag & drop or click to upload')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('students.supportedFileFormats', 'JPG, PNG, PDF — max 10 MB')}
              </p>
            </div>
          </button>
        ) : (
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="shrink-0">
              {showImage && displayUrl ? (
                <img
                  src={displayUrl}
                  alt={label}
                  className="h-20 w-20 rounded-lg border object-cover bg-background"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg border bg-background flex items-center justify-center">
                  {showImage ? (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium truncate">{displayName}</p>
                {ext && (
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {ext}
                  </span>
                )}
              </div>
              {displaySize && (
                <p className="text-xs text-muted-foreground">{displaySize}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  {t('students.replaceFile', 'Replace')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    onClear();
                    if (inputRef.current) inputRef.current.value = '';
                    setError(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {t('students.removeFile', 'Remove')}
                </Button>
                {existingUrl && !preview && (
                  <Button type="button" variant="ghost" size="sm" className="h-8" asChild>
                    <a href={existingUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t('common.view', 'View')}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export const STUDENT_DOCUMENT_FIELDS: Array<{
  field: StudentDocumentField;
  labelKey: string;
  descriptionKey?: string;
}> = [
  { field: 'tazkira_copy', labelKey: 'students.tazkiraCopy' },
  { field: 'parent_tazkira_copy', labelKey: 'students.parentTazkiraCopy' },
  {
    field: 'previous_result_card',
    labelKey: 'students.previousResultCard',
    descriptionKey: 'students.previousResultCardHint',
  },
  { field: 'payment_receipt', labelKey: 'students.paymentReceipt' },
];
