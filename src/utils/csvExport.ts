import { buildRowsFromHourly24, HOUR_INDEX_LABELS } from './analyticsTable';
import { contactNameDisplay } from './contactMerge';
import type { ContactRow, DspAnalyticsBlock } from '../types';

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadContactsCsv(contacts: ContactRow[], productName: string, dateRange: string) {
  if (!contacts.length) {
    window.alert('No contact data available to download');
    return;
  }
  const header = [
    'Mobile Number',
    'Name',
    'Status',
    'Product info',
    'Customer DSP',
    'Domain',
    'Product ID',
    'Price',
  ];
  const lines = [
    header.map(escapeCsvCell).join(','),
    ...contacts.map((c) =>
      [
        c.mobile || c.phone || '',
        contactNameDisplay(c),
        (c.status || '').trim() || '—',
        c.productInfo || '',
        c.customerDsp || '',
        c.lineDomain || '',
        c.sourceProductId != null ? String(c.sourceProductId) : '',
        c.linePrice || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];
  const safeProduct = productName.toLowerCase().replace(/\s+/g, '_');
  downloadTextFile(
    `contacts_${safeProduct}_${dateRange}.csv`,
    lines.join('\n'),
    'text/csv;charset=utf-8'
  );
}

export function downloadAnalyticsCsv(
  blocks: DspAnalyticsBlock[],
  dateRange: string,
  showHourlyColumns: boolean
) {
  if (!blocks.length) {
    window.alert('No analytics data available to download');
    return;
  }

  const parts: string[] = [];

  for (const b of blocks) {
    parts.push(
      escapeCsvCell(`DSP: ${b.dsp} | Domain: ${b.domain} | Product: ${b.productName}`)
    );
    const rows = buildRowsFromHourly24(b.hourly, showHourlyColumns);
    const head = [
      'Metric',
      'Total',
      ...(showHourlyColumns ? [...HOUR_INDEX_LABELS] : []),
    ];
    parts.push(head.map(escapeCsvCell).join(','));
    for (const r of rows) {
      parts.push([r.label, r.total, ...r.cells].map(escapeCsvCell).join(','));
    }
    parts.push('');
  }

  const safe = blocks[0]!.productName.toLowerCase().replace(/\s+/g, '_');
  downloadTextFile(`analytics_${safe}_${dateRange}.csv`, parts.join('\n'), 'text/csv;charset=utf-8');
}
