
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility for merging tailwind classes with logical priority.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Production-safe logger that only outputs in development mode.
 */
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args: any[]) => {
    // Errors should be reported even in production for debugging
    console.error('[ERROR]', ...args);
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[WARN]', ...args);
    }
  }
};

/**
 * Validation helpers for financial and inventory data.
 */
/** Parse ISO strings or legacy Firestore Timestamp-like values from storage. */
export function parseStoredDate(
  value: string | Date | { toDate?: () => Date } | undefined | null
): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const validate = {
  isPositive: (val: number | string) => {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(n) && n > 0;
  },
  isNonNegative: (val: number | string) => {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(n) && n >= 0;
  },
  hasRequiredFields: (obj: any, fields: string[]) => {
    return fields.every(f => obj[f] !== undefined && obj[f] !== null && obj[f] !== '');
  }
};

/**
 * Performance tracking utility.
 */
export const perf = {
  mark: (name: string) => {
    if (typeof window !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },
  measure: (name: string, startMark: string) => {
    if (typeof window !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark);
        const entries = performance.getEntriesByName(name);
        if (entries.length > 0) {
          logger.log(`PERF: ${name} took ${entries[0].duration.toFixed(2)}ms`);
        }
      } catch (e) {
        // Ignore if marks are missing
      }
    }
  }
};
