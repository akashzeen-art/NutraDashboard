import { useMemo } from 'react';
import { buildRowsFromHourly24, HOUR_INDEX_LABELS } from '../utils/analyticsTable';
import type { Hourly24 } from '../types';

type AnalyticsTableProps = {
  hourly: Hourly24 | null;
  showHourlyColumns: boolean;
  caption?: string;
};

export function AnalyticsTable({ hourly, showHourlyColumns, caption }: AnalyticsTableProps) {
  const rows = useMemo(
    () => buildRowsFromHourly24(hourly, showHourlyColumns),
    [hourly, showHourlyColumns]
  );

  return (
    <div className="analytics-hourly-panel">
      {caption ? <p className="analytics-table-caption">{caption}</p> : null}
      <div className="analytics-hourly-scroll" role="region" aria-label="Hourly performance metrics">
        <table
          className={`analytics-table analytics-table-24h${showHourlyColumns ? ' is-hourly' : ''}`}
        >
          <colgroup>
            <col className="col-metric" />
            <col className="col-total" />
            {showHourlyColumns
              ? HOUR_INDEX_LABELS.map((label) => <col key={label} className="col-hour" />)
              : null}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky-col-metric" scope="col">
                <span className="th-metric-inner">Metric</span>
              </th>
              <th className="sticky-col-total total-column" scope="col">
                Total
              </th>
              {showHourlyColumns
                ? HOUR_INDEX_LABELS.map((label) => (
                    <th key={label} className="hour-col th-hour" scope="col" title={`Hour ${label}`}>
                      <span className="th-hour-label">{label}</span>
                    </th>
                  ))
                : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="sticky-col-metric td-metric" scope="row">
                  {row.label}
                </th>
                <td className="sticky-col-total total-column">{row.total}</td>
                {showHourlyColumns
                  ? HOUR_INDEX_LABELS.map((label, i) => (
                      <td
                        key={label}
                        className={`hour-cell num-cell ${i % 2 === 0 ? 'hour-band-a' : 'hour-band-b'}`}
                      >
                        {row.cells[i]}
                      </td>
                    ))
                  : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
