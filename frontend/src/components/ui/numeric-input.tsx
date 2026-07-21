import * as React from 'react';

import { cn } from '@/lib/utils';
import { normalizeNumericInput, type NormalizeNumericOptions } from '@/lib/digits';
import { Input } from '@/components/ui/input';

export type NumericInputProps = Omit<
  React.ComponentProps<'input'>,
  'type' | 'inputMode' | 'value' | 'onChange'
> &
  NormalizeNumericOptions & {
    value?: string | number | null;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /** Preferred callback — always receives a normalized Latin numeric string. */
    onValueChange?: (value: string) => void;
  };

function toDisplayString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

/**
 * Locale-safe numeric field for en / fa / ps keyboards.
 * Uses text + inputMode so Persian/Pashto digits are accepted, then converted to Latin 0-9.
 * Decimals use `.` (xxx.xx). Always renders LTR for stable caret/decimal entry.
 *
 * Keeps a local draft while focused so parents that coerce with parseFloat/parseInt
 * do not destroy intermediate input like "12." or "".
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      className,
      value,
      onChange,
      onValueChange,
      onFocus,
      onBlur,
      allowDecimal = true,
      allowNegative = false,
      maxDecimals,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);
    const [draft, setDraft] = React.useState('');
    const propValue = toDisplayString(value);
    const displayValue = focused ? draft : propValue;

    const emit = (next: string, originalEvent?: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(next);
      if (onChange) {
        if (originalEvent) {
          const synthetic = {
            ...originalEvent,
            target: { ...originalEvent.target, value: next },
            currentTarget: { ...originalEvent.currentTarget, value: next },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(synthetic);
        } else {
          onChange({
            target: { value: next },
            currentTarget: { value: next },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = normalizeNumericInput(event.target.value, {
        allowDecimal,
        allowNegative,
        maxDecimals,
      });
      setDraft(next);
      emit(next, event);
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pasted = event.clipboardData.getData('text');
      const next = normalizeNumericInput(pasted, {
        allowDecimal,
        allowNegative,
        maxDecimals,
      });
      setDraft(next);
      emit(next);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      setDraft(propValue);
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(event);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        lang="en"
        dir="ltr"
        autoComplete="off"
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn('tabular-nums text-left', className)}
      />
    );
  },
);

NumericInput.displayName = 'NumericInput';

export { NumericInput };
