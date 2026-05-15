
export const WORKING_HOURS_PER_DAY = 12;

export function timeToDecimal(val: string): number | '' {
  if (!val) return '';
  const s = val.trim().replace(/[^0-9:.]/g, '');
  if (s === '') return '';

  if (s.includes(':')) {
    const [hPart, mPart] = s.split(':');
    const hh = parseInt(hPart) || 0;
    const mm = parseInt(mPart) || 0;
    const safeMM = Math.min(59, Math.max(0, mm));
    return parseFloat((hh + safeMM / 60).toFixed(4));
  }

  if (s.includes('.')) {
    return parseFloat(s) || '';
  }

  if (s.length <= 2) return parseInt(s) || 0;
  if (s.length === 3) {
    const hh = parseInt(s.slice(0, 1));
    const mm = Math.min(59, parseInt(s.slice(1)));
    return parseFloat((hh + mm / 60).toFixed(4));
  }
  if (s.length >= 4) {
    const hh = parseInt(s.slice(0, 2));
    const mm = Math.min(59, parseInt(s.slice(2, 4)));
    return parseFloat((hh + mm / 60).toFixed(4));
  }
  return parseFloat(s) || '';
}

export function decimalToHHMM(val: number | string): string {
  if (val === '' || val === undefined || val === null) return '';
  const d = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(d) || d < 0) return '';
  const h = Math.floor(d);
  const m = Math.round((d - h) * 60);
  const safM = m >= 60 ? 59 : m;
  return h + ':' + String(safM).padStart(2, '0');
}

export function calculateHours(start: string, end: string): number {
  const s = timeToDecimal(start);
  const e = timeToDecimal(end);
  if (s === '' || e === '') return 0;
  let h = (e as number) - (s as number);
  if (h < 0) h += 24;
  return Math.max(0, Math.round(h * 60) / 60);
}

export function getAutoStatus(totalHrs: number): 'P' | 'H' | 'OT' | 'A' {
  if (totalHrs < 1) return 'A';
  if (totalHrs < 6) return 'H';
  if (totalHrs < WORKING_HOURS_PER_DAY) return 'P';
  return 'OT';
}

export function getEmpHourlyRate(monthlySal: number, daysInMonth: number, baseHrs: number = WORKING_HOURS_PER_DAY): number {
  if (monthlySal <= 0) return 0;
  const workingHrsPerMonth = daysInMonth * baseHrs;
  return parseFloat((monthlySal / workingHrsPerMonth).toFixed(4));
}
