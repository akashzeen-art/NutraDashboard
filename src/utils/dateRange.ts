/** YYYY-MM-DD + 1 day (local calendar). */
export function addOneDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d! + 1);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function enumerateInclusiveISODates(from: string, to: string, maxDays: number): string[] {
  let a = from <= to ? from : to;
  let b = from <= to ? to : from;
  const out: string[] = [];
  let cur = a;
  let n = 0;
  while (cur <= b && n < maxDays) {
    out.push(cur);
    cur = addOneDay(cur);
    n++;
  }
  return out;
}
