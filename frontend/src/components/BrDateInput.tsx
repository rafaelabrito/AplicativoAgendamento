import { useEffect, useMemo, useRef, useState } from 'react';

type BrDateInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
};

const toDisplayDate = (iso: string) => {
  if (!iso || iso.length < 10) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
};

const isValidIsoDate = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(`${iso}T12:00:00`);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === year
    && date.getMonth() + 1 === month
    && date.getDate() === day;
};

const toIsoDate = (display: string) => {
  const clean = (display || '').replace(/_/g, '').trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return '';
  const [day, month, year] = clean.split('/');
  const iso = `${year}-${month}-${day}`;
  return isValidIsoDate(iso) ? iso : '';
};

const normalizeDisplayValue = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 4);
  const third = digits.slice(4, 8);

  if (digits.length <= 2) return first;
  if (digits.length <= 4) return `${first}/${second}`;
  return `${first}/${second}/${third}`;
};

export default function BrDateInput({
  value,
  onValueChange,
  id,
  name,
  placeholder = 'dd/mm/aaaa',
  style,
  className,
  required,
  disabled,
  min,
  max,
}: BrDateInputProps) {
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
  const [displayValue, setDisplayValue] = useState(() => toDisplayDate(value));

  useEffect(() => {
    setDisplayValue(toDisplayDate(value));
  }, [value]);

  const buttonStyle = useMemo<React.CSSProperties>(() => ({
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 0,
    background: 'transparent',
    padding: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#334155',
  }), [disabled]);

  const openNativePicker = () => {
    if (disabled) return;
    const input = nativeInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.click();
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDisplayValue = normalizeDisplayValue(event.target.value);
    setDisplayValue(nextDisplayValue);

    if (!nextDisplayValue) {
      onValueChange('');
      return;
    }

    const isoValue = toIsoDate(nextDisplayValue);
    if (isoValue) {
      onValueChange(isoValue);
    }
  };

  const handleBlur = () => {
    const isoValue = toIsoDate(displayValue);
    if (!displayValue) {
      onValueChange('');
      return;
    }

    if (isoValue) {
      setDisplayValue(toDisplayDate(isoValue));
      onValueChange(isoValue);
      return;
    }

    setDisplayValue(toDisplayDate(value));
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onClick={openNativePicker}
        style={{ ...style, paddingRight: 38, width: style?.width ?? '100%' }}
        className={className}
        required={required}
        disabled={disabled}
      />

      <button type="button" onClick={openNativePicker} style={buttonStyle} tabIndex={-1} disabled={disabled} aria-label="Abrir calendário">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M17 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 9H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      <input
        ref={nativeInputRef}
        type="date"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
          inset: 0,
        }}
      />
    </div>
  );
}