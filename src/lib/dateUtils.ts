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
