import { DataRecord, GenericColumnDef, ColumnFormat, ColorRule } from '../../models/hierarchy.model';

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(code: string, precision: number): Intl.NumberFormat {
  const key = `${code}:${precision}`;
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
    currencyFormatters.set(key, fmt);
  }
  return fmt;
}

const numberFormatters = new Map<number, Intl.NumberFormat>();

function getNumberFormatter(precision: number): Intl.NumberFormat {
  let fmt = numberFormatters.get(precision);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
    numberFormatters.set(precision, fmt);
  }
  return fmt;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

export function formatCellValue(value: unknown, col: GenericColumnDef): string {
  if (value == null || value === '') return '';

  const format = col.format ?? 'text';
  const precision = col.precision ?? 0;

  switch (format) {
    case 'currency': {
      const num = toNumber(value);
      if (num === null) return String(value);
      return getCurrencyFormatter(col.currencyCode ?? 'USD', precision).format(num);
    }
    case 'number': {
      const num = toNumber(value);
      if (num === null) return String(value);
      return getNumberFormatter(precision).format(num);
    }
    case 'percent': {
      const num = toNumber(value);
      if (num === null) return String(value);
      return `${getNumberFormatter(precision).format(num * 100)}%`;
    }
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return isNaN(d.getTime()) ? String(value) : dateFormatter.format(d);
    }
    case 'text':
    default:
      return String(value);
  }
}

export function computeProgress(record: DataRecord, col: GenericColumnDef): number | null {
  if (!col.progressOf) return null;
  const value = toNumber(record[col.field]);
  const total = toNumber(record[col.progressOf]);
  if (value === null || total === null || total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

export type TrendDirection = 'up' | 'down' | 'neutral';

export function computeTrend(record: DataRecord, col: GenericColumnDef): TrendDirection | null {
  if (!col.trendVs) return null;
  const value = toNumber(record[col.field]);
  const compare = toNumber(record[col.trendVs]);
  if (value === null || compare === null) return null;
  if (value > compare) return 'up';
  if (value < compare) return 'down';
  return 'neutral';
}

export function computeValueColor(value: unknown, rule?: ColorRule): string {
  if (!rule) return '';
  const num = toNumber(value);
  if (num === null) return '';
  if (num > 0) return rule.positive === 'success' ? 'color-success' : 'color-error';
  if (num < 0) return rule.negative === 'success' ? 'color-success' : 'color-error';
  const zero = rule.zero ?? 'neutral';
  if (zero === 'neutral') return '';
  return zero === 'success' ? 'color-success' : 'color-error';
}

export function computeTrendColor(trend: TrendDirection, rule?: ColorRule): string {
  if (!rule) {
    // default: up=green, down=red
    return trend === 'up' ? 'color-success' : trend === 'down' ? 'color-error' : '';
  }
  // up means value increased (positive change)
  if (trend === 'up') return rule.positive === 'success' ? 'color-success' : 'color-error';
  if (trend === 'down') return rule.negative === 'success' ? 'color-success' : 'color-error';
  return '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return isNaN(n) ? null : n;
  }
  return null;
}
