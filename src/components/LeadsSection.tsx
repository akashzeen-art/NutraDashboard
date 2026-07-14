import { Fragment } from 'react';
import type { FormLeadRecord } from '../types';
import { formatDateDisplay, formatDateTimeDisplay } from '../utils/dateFormat';
import { displayLeadName, groupLeadsByDate, leadRowKey } from '../utils/formLeads';
import { SectionCard } from './SectionCard';

type LeadsSectionProps = {
  leads: FormLeadRecord[] | null;
  loading: boolean;
  neverFetched: boolean;
  rangeLabel: string;
  productLabel: string;
  selectedProductId: number | null;
  error: string | null;
};

const LEADS_COL_COUNT = 9;

function dash(v: string | number | null | undefined): string {
  if (v === undefined || v === null) return '—';
  const s = String(v).trim();
  return s || '—';
}

export function LeadsSection({
  leads,
  loading,
  neverFetched,
  rangeLabel,
  productLabel,
  selectedProductId,
  error,
}: LeadsSectionProps) {
  const groups = leads ? groupLeadsByDate(leads) : [];
  const total = leads?.length ?? 0;
  let rowIndex = 0;

  const subtitle = [
    productLabel,
    selectedProductId != null ? `Product ID ${selectedProductId}` : 'All product IDs',
    rangeLabel,
  ].join(' · ');

  return (
    <SectionCard
      title="Form Leads"
      badge={!neverFetched && !loading ? total : null}
      subtitle={subtitle}
    >
      {neverFetched ? (
        <p className="empty-state">
          Set filters above and click <strong>Fetch Leads</strong>.
        </p>
      ) : loading && !leads ? (
        <p className="empty-state">Loading leads…</p>
      ) : error ? (
        <p className="empty-state leads-error">{error}</p>
      ) : !leads?.length ? (
        <p className="empty-state">No leads returned for this product and date range.</p>
      ) : (
        <div className="contacts-table-wrap">
          <div className="contacts-table-scroll">
            <table className="contacts-table leads-table">
              <thead>
                <tr>
                  <th scope="col">Product ID</th>
                  <th scope="col">MSISDN</th>
                  <th scope="col">Name</th>
                  <th scope="col">DSP</th>
                  <th scope="col">Product name</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Qty</th>
                  <th scope="col" className="leads-col-address">
                    Address
                  </th>
                  <th scope="col" className="leads-col-time">
                    Created at
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.date}>
                    <tr className="leads-date-row">
                      <td colSpan={LEADS_COL_COUNT}>
                        <span className="leads-date-label">{formatDateDisplay(group.date)}</span>
                        <span className="leads-date-count">{group.rows.length} record(s)</span>
                      </td>
                    </tr>
                    {group.rows.map((lead) => {
                      const key = leadRowKey(lead, rowIndex++);
                      return (
                        <tr key={key}>
                          <td>{lead.productId}</td>
                          <td className="contacts-td-mobile">{dash(lead.msisdn)}</td>
                          <td>{displayLeadName(lead.name)}</td>
                          <td>{dash(lead.dsp)}</td>
                          <td>{dash(lead.productName)}</td>
                          <td className="leads-td-mode">{dash(lead.mode)}</td>
                          <td className="leads-td-qty">{dash(lead.qty)}</td>
                          <td className="leads-td-address" title={lead.address ?? undefined}>
                            {dash(lead.address)}
                          </td>
                          <td className="leads-td-time">
                            {lead.createdAt ? formatDateTimeDisplay(lead.createdAt) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
