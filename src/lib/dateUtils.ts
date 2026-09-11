/**
 * Date utility helpers for Global Active Working Business Date
 */

export function getWorkingDate(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nexus_working_date');
    if (saved) return saved;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${dateStr}T${hours}:${mins}`;
}
