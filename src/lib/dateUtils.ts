/**
 * Date utility helpers for Global Active Working Business Date in Indian Standard Time (IST / Asia/Kolkata)
 */

export function getTodayISTDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function getWorkingDate(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nexus_working_date');
    if (saved) return saved;
  }
  return getTodayISTDateString();
}

export function setWorkingDate(dateStr: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexus_working_date', dateStr);
    window.dispatchEvent(new Event('nexus_working_date_changed'));
  }
}

export function getWorkingDateTimeISO(): string {
  const dateStr = getWorkingDate();
  const now = new Date();
  const formatterHours = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeStr = formatterHours.format(now);
  return `${dateStr}T${timeStr}`;
}

export function formatISTDateTime(dateInput: Date | string | number): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Safely parses any date input (including datetime-local strings like "YYYY-MM-DDTHH:mm")
 * as Indian Standard Time (+05:30 offset) regardless of server timezone.
 */
export function parseISTDate(createdAtInput?: string | Date | number): Date | undefined {
  if (!createdAtInput) return undefined;
  if (createdAtInput instanceof Date) {
    return isNaN(createdAtInput.getTime()) ? undefined : createdAtInput;
  }
  const str = String(createdAtInput).trim();
  if (!str) return undefined;

  // If string is ISO without timezone offset (e.g. "2026-09-18T20:45" or "2026-09-18T20:45:00")
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    const isoWithOffset = str.length === 16 ? `${str}:00+05:30` : `${str}+05:30`;
    const d = new Date(isoWithOffset);
    return !isNaN(d.getTime()) ? d : undefined;
  }

  const d = new Date(str);
  return !isNaN(d.getTime()) ? d : undefined;
}

export function getISTDayStart(dateStr?: string): Date {
  if (!dateStr) dateStr = getTodayISTDateString();
  const d = new Date(`${dateStr}T00:00:00.000+05:30`);
  if (!isNaN(d.getTime())) return d;
  return new Date(dateStr);
}

export function getISTDayEnd(dateStr?: string): Date {
  if (!dateStr) dateStr = getTodayISTDateString();
  const d = new Date(`${dateStr}T23:59:59.999+05:30`);
  if (!isNaN(d.getTime())) return d;
  return new Date(dateStr);
}

/**
 * Converts any Date or ISO string into an IST "YYYY-MM-DDTHH:mm" format for <input type="datetime-local" />
 */
export function toISTDateTimeLocalString(dateInput?: Date | string | number): string {
  if (!dateInput) return getWorkingDateTimeISO();
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return getWorkingDateTimeISO();

  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return `${datePart}T${timePart}`;
}
