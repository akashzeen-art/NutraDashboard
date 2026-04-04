export function formatDateDisplay(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0]!;
}
