import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchBucketWiseReport } from '../api/report';
import { fetchContactDetails, mergeContactDetailsFromApi } from '../api/contactDetails';
import { DASHBOARD_PRODUCT_TABS, DATE_RANGE_MAX_DAYS, type DashboardProductTabId } from '../config';
import type { ContactDetails, ContactRow, ProductReport } from '../types';
import { formatDateDisplay, todayIsoDate } from '../utils/dateFormat';
import { enumerateInclusiveISODates } from '../utils/dateRange';
import { downloadAnalyticsCsv, downloadContactsCsv } from '../utils/csvExport';
import { findProductReportByNameHints } from '../utils/matchProduct';
import {
  buildDashboardModels,
  buildSummary,
  filterRowsForTab,
  uniqueDspsForTab,
  uniquePubIdsForTab,
  type DashboardSummary,
} from '../utils/dashboardData';
import {
  contactNameDisplay,
  contactRowDedupeKey,
  contactRowToDetailsPartial,
  contactStatusDisplay,
} from '../utils/contactMerge';
import { ContactModal } from './ContactModal';
import { AnalyticsTable } from './AnalyticsTable';

type DashboardProps = {
  onLogout: () => void;
};

function contactStatusClass(statusLabel: string): string {
  const s = statusLabel.trim().toLowerCase();
  if (!s || s === '—') return 'status-pill status-unknown';
  if (s.includes('success')) return 'status-pill status-success';
  if (s.includes('fail')) return 'status-pill status-failed';
  if (s.includes('initiat')) return 'status-pill status-initiated';
  return 'status-pill status-neutral';
}

function dateRangeFilenamePart(from: string, to: string): string {
  return from === to ? from : `${from}_to_${to}`;
}

function dayCount(from: string, to: string): number {
  const d0 = new Date(from + 'T12:00:00');
  const d1 = new Date(to + 'T12:00:00');
  const lo = d0 <= d1 ? d0 : d1;
  const hi = d0 <= d1 ? d1 : d0;
  return Math.floor((hi.getTime() - lo.getTime()) / 86400000) + 1;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const today = todayIsoDate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [apiResponseData, setApiResponseData] = useState<ProductReport[] | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardProductTabId>('ameora');
  const [dspPreset, setDspPreset] = useState<string>('All');
  const [pubIdQuery, setPubIdQuery] = useState('');
  const [showHourlyColumns, setShowHourlyColumns] = useState(true);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetails, setModalDetails] = useState<ContactDetails | null>(null);

  const isFirstRangeEffect = useRef(true);
  const allowAutoRefetch = useRef(false);
  const autoRefreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const filters = useMemo(
    () => ({ dspPreset, pubIdQuery }),
    [dspPreset, pubIdQuery]
  );

  const dspOptions = useMemo(
    () => ['All', ...uniqueDspsForTab(apiResponseData ?? [], activeTab)],
    [apiResponseData, activeTab]
  );

  const pubIdSuggestions = useMemo(
    () => uniquePubIdsForTab(apiResponseData ?? [], activeTab),
    [apiResponseData, activeTab]
  );

  useEffect(() => {
    if (dspPreset !== 'All' && !dspOptions.includes(dspPreset)) {
      setDspPreset('All');
    }
  }, [dspOptions, dspPreset]);

  const { contacts, dspBlocks, hasProductMatch } = useMemo(
    () => buildDashboardModels(apiResponseData ?? [], activeTab, filters),
    [apiResponseData, activeTab, filters]
  );

  const summary = useMemo<DashboardSummary | null>(() => {
    if (!apiResponseData) return null;
    const tabRows = filterRowsForTab(apiResponseData, activeTab);
    return buildSummary(tabRows);
  }, [apiResponseData, activeTab]);

  const productIdForContact = useMemo(() => {
    const rows = filterRowsForTab(apiResponseData ?? [], activeTab);
    return rows[0]?.productId ?? null;
  }, [apiResponseData, activeTab]);

  const rangeLabel = useMemo(() => {
    if (dateFrom === dateTo) return formatDateDisplay(dateFrom);
    return `${formatDateDisplay(dateFrom)} – ${formatDateDisplay(dateTo)}`;
  }, [dateFrom, dateTo]);

  const handleFetch = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      window.alert('Please select a date range');
      return;
    }
    const span = dayCount(dateFrom, dateTo);
    if (span > DATE_RANGE_MAX_DAYS) {
      window.alert(`Date range cannot exceed ${DATE_RANGE_MAX_DAYS} days.`);
      return;
    }
    setLoading(true);
    try {
      const dates = enumerateInclusiveISODates(dateFrom, dateTo, DATE_RANGE_MAX_DAYS);
      const chunks = await Promise.all(dates.map((d) => fetchBucketWiseReport(d)));
      const data = chunks.flat();
      setApiResponseData(data);
      allowAutoRefetch.current = true;
      // Start / restart 5-minute auto-refresh
      if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
      autoRefreshTimer.current = setInterval(() => void handleFetch(), 5 * 60 * 1000);
      if (data.length > 0) {
        setActiveTab((currentTab) => {
          const hints = DASHBOARD_PRODUCT_TABS.find((t) => t.id === currentTab)?.nameHints;
          if (hints && findProductReportByNameHints(data, hints)) {
            return currentTab;
          }
          const am = findProductReportByNameHints(data, DASHBOARD_PRODUCT_TABS[0]!.nameHints);
          const pt = findProductReportByNameHints(data, DASHBOARD_PRODUCT_TABS[1]!.nameHints);
          if (am) return 'ameora';
          if (pt) return 'playTonight';
          return currentTab;
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      window.alert('Error fetching data. Please check the console for details.');
      setApiResponseData(null);
      allowAutoRefetch.current = false;
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (isFirstRangeEffect.current) {
      isFirstRangeEffect.current = false;
      return;
    }
    if (!allowAutoRefetch.current) return;
    void handleFetch();
  }, [dateFrom, dateTo, handleFetch]);

  useEffect(() => {
    return () => {
      if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
    };
  }, []);

  const neverFetched = apiResponseData === null;
  const filteredOut =
    hasProductMatch && dspBlocks.length === 0 && !neverFetched && (apiResponseData?.length ?? 0) > 0;
  const showTables = dspBlocks.length > 0;

  const productNameForExport = dspBlocks[0]?.productName || DASHBOARD_PRODUCT_TABS.find((t) => t.id === activeTab)?.label || 'product';
  const exportDatePart = dateRangeFilenamePart(dateFrom, dateTo);

  async function handleViewContact(row: ContactRow) {
    const m = row.mobile || row.phone;
    if (!m) return;
    setModalDetails(contactRowToDetailsPartial(row));
    setModalOpen(true);
    try {
      const extra = await fetchContactDetails(m, {
        date: dateFrom,
        productId: row.sourceProductId ?? productIdForContact,
      });
      setModalDetails((prev) => (prev ? mergeContactDetailsFromApi(prev, extra) : prev));
    } catch (e) {
      console.error('Error fetching contact details:', e);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userEmail');
    onLogout();
  }

  return (
    <div className="dashboard-page">
      {loading ? (
        <div className="loading-overlay" aria-busy="true" aria-live="polite">
          <div className="loading-spinner" />
          <span className="loading-text">Loading report…</span>
        </div>
      ) : null}

      <header className="dashboard-header dashboard-header-sticky">
        <h1>Nutra Dashboard</h1>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="dashboard-container dashboard-container-body">
        <section className="product-selection">
          <div className="product-buttons product-buttons-with-hint">
            {neverFetched && (
              <p className="no-data">
                Choose <strong>Ameora</strong> or <strong>PlayTonight</strong>, set the date range, adjust filters if
                needed, then <strong>Fetch Data</strong>. Changing the range refetches after the first successful load.
              </p>
            )}
            {!neverFetched && apiResponseData && apiResponseData.length === 0 && (
              <p className="no-products">No rows returned for this date range</p>
            )}
            <div className="product-buttons-row">
              {DASHBOARD_PRODUCT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`product-btn${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="date-filter date-filter-range">
          <div className="filter-field">
            <label htmlFor="date-from">From</label>
            <input
              id="date-from"
              type="date"
              className="date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="date-to">To</label>
            <input
              id="date-to"
              type="date"
              className="date-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="fetch-btn"
            disabled={loading}
            onClick={() => void handleFetch()}
          >
            {loading ? 'Loading…' : 'Fetch Data'}
          </button>
        </section>

        <section className="filters-panel" aria-label="Filters">
          <div className="filter-field">
            <label htmlFor="dsp-filter">DSP</label>
            <select
              id="dsp-filter"
              className="filter-select"
              value={dspOptions.includes(dspPreset) ? dspPreset : 'All'}
              onChange={(e) => setDspPreset(e.target.value)}
            >
              {dspOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field filter-field-grow">
            <label htmlFor="pub-id">Pub ID</label>
            <input
              id="pub-id"
              type="text"
              className="date-input filter-text"
              placeholder="Filter by Pub ID"
              list="pub-id-suggestions"
              autoComplete="off"
              value={pubIdQuery}
              onChange={(e) => setPubIdQuery(e.target.value)}
            />
            <datalist id="pub-id-suggestions">
              {pubIdSuggestions.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>
          <label className="toggle-hourly">
            <input
              type="checkbox"
              checked={showHourlyColumns}
              onChange={(e) => setShowHourlyColumns(e.target.checked)}
            />
            Hour detail (24 columns)
          </label>
        </section>

        {showTables && (
          <section className="product-meta-strip" aria-label="Product details">
            <p>
              <strong>Product focus:</strong> {DASHBOARD_PRODUCT_TABS.find((t) => t.id === activeTab)?.label} —{' '}
              <strong>Date range:</strong> {rangeLabel}
            </p>
            <p>
              <strong>DSP groups:</strong> {dspBlocks.length}
            </p>
          </section>
        )}

        <section className="contact-section">
          <h2>Registered Contacts</h2>
          <div className="contacts-table-wrap">
            {neverFetched ? (
              <p className="no-data">Fetch data to load contacts for the selected product and filters.</p>
            ) : !hasProductMatch ? (
              <p className="no-data">
                No API rows match <strong>{DASHBOARD_PRODUCT_TABS.find((t) => t.id === activeTab)?.label}</strong> for
                this range. Try the other product or different dates.
              </p>
            ) : filteredOut ? (
              <p className="no-data">No rows match your DSP or Pub ID filters. Widen filters and check again.</p>
            ) : !contacts.length ? (
              <p className="no-data">No contacts (msisdn list empty) for this selection.</p>
            ) : (
              <div className="contacts-table-scroll">
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th scope="col">Mobile number</th>
                      <th scope="col">Name</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="contacts-col-meta">
                        Product info
                      </th>
                      <th scope="col">DSP</th>
                      <th scope="col" className="contacts-col-domain">
                        Domain
                      </th>
                      <th scope="col" className="contacts-th-action">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => {
                      const m = c.mobile || c.phone || '';
                      const statusLabel = contactStatusDisplay(c);
                      return (
                        <tr key={contactRowDedupeKey(c)}>
                          <td className="contacts-td-mobile">{m || '—'}</td>
                          <td>{contactNameDisplay(c)}</td>
                          <td>
                            <span className={contactStatusClass(statusLabel)}>{statusLabel}</span>
                          </td>
                          <td className="contacts-td-meta">{c.productInfo?.trim() || '—'}</td>
                          <td>{c.customerDsp?.trim() || '—'}</td>
                          <td className="contacts-td-domain">{c.lineDomain?.trim() || '—'}</td>
                          <td className="contacts-td-action">
                            <button
                              type="button"
                              className="view-btn view-btn-compact"
                              onClick={() => void handleViewContact(c)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <ContactModal open={modalOpen} details={modalDetails} onClose={() => setModalOpen(false)} />

        {summary && (summary.byDsp.length > 0 || summary.byProduct.length > 0) && (
          <section className="summary-section" aria-label="Conversion summary">
            <h2>Conversion Summary</h2>

            {/* PayU Gateway total — compare this directly against PayU dashboard */}
            <div className="payu-gateway-card">
              <div className="payu-gateway-title">PayU Gateway Total <span className="payu-gateway-hint">(compare this with PayU dashboard)</span></div>
              <div className="payu-gateway-stats">
                <div className="payu-stat">
                  <span className="payu-stat-label">Checkout Initiated</span>
                  <span className="payu-stat-value">{summary.payuGatewayInitiated}</span>
                </div>
                <div className="payu-stat payu-stat-success">
                  <span className="payu-stat-label">Purchase (Success)</span>
                  <span className="payu-stat-value">{summary.payuGatewaySuccess}</span>
                </div>
              </div>
              <p className="payu-gateway-note">
                This is the raw <code>successCount</code> sum from the API across all DSPs.
                If PayU shows a higher number, the API backend is not recording all successful payments in the hour buckets.
              </p>
            </div>

            <div className="summary-grid">
              {summary.byDsp.map((d) => (
                <div key={d.dspLabel} className="summary-card">
                  <h3 className="summary-card-title">{d.dspLabel}</h3>
                  <table className="summary-table">
                    <tbody>
                      <tr><th>Clicks</th><td>{d.clicks}</td></tr>
                      <tr><th>Checkout Initiated</th><td>{d.initiated}</td></tr>
                      <tr><th>Purchase (Success)</th><td>{d.success}</td></tr>
                      <tr className="summary-row-sub"><th>↳ from hour buckets</th><td>{d.hoursSuccess}</td></tr>
                      <tr className="summary-row-sub"><th>↳ from user list</th><td>{d.msisdnSuccess}</td></tr>
                      <tr><th>Failure</th><td>{d.failed}</td></tr>
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="summary-card summary-card-total">
                <h3 className="summary-card-title">Total</h3>
                <table className="summary-table">
                  <tbody>
                    <tr><th>Checkout Initiated</th><td>{summary.totalInitiated}</td></tr>
                    <tr><th>Purchase (Success)</th><td>{summary.totalSuccess}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {summary.byProduct.length > 0 && (
              <div className="summary-products">
                <h3>Product Breakdown</h3>
                <table className="summary-table summary-table-products">
                  <thead>
                    <tr>
                      <th>Product ID</th>
                      <th>Product Name</th>
                      <th>Initiated</th>
                      <th>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byProduct.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.productId}</td>
                        <td>{p.productName}</td>
                        <td>{p.initiated}</td>
                        <td>{p.success}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="analytics-section">
          <h2>Performance Analytics</h2>
          <div className="analytics-header analytics-header-compact">
            <p>
              <strong>Date:</strong> <span>{rangeLabel}</span>
            </p>
            <p className="analytics-sub">
              Metrics and hour buckets come from the API response. Wide ranges (e.g. 12:00–16:00) are split into 24
              one-hour columns (12–13 … 15–16). Entry (Mobile No) uses <code>msisdnList</code> length, spread by hourly
              click share when clicks exist.
            </p>
          </div>

          {!neverFetched && !hasProductMatch ? (
            <p className="no-data analytics-empty">No analytics — select a product that exists in the API response.</p>
          ) : filteredOut ? (
            <p className="no-data analytics-empty">No analytics — adjust DSP / Pub ID filters.</p>
          ) : (
            dspBlocks.map((b) => (
              <div key={b.key} className="dsp-block">
                <h3 className="dsp-block-title">
                  <span className="dsp-product-id">ID: {b.productId}</span>
                  <span className="dsp-sep">|</span>
                  <strong className="dsp-name">{b.dsp}</strong>
                  <span className="dsp-sep">|</span>
                  <span className="dsp-domain">{b.domain}</span>
                </h3>
                <AnalyticsTable
                  hourly={b.hourly}
                  showHourlyColumns={showHourlyColumns}
                />
              </div>
            ))
          )}
        </section>

        <section className="download-section">
          <button
            type="button"
            className="download-btn"
            onClick={() => downloadContactsCsv(contacts, productNameForExport, exportDatePart)}
          >
            Download Contacts CSV
          </button>
          <button
            type="button"
            className="download-btn"
            onClick={() => downloadAnalyticsCsv(dspBlocks, exportDatePart, showHourlyColumns)}
          >
            Download Analytics CSV
          </button>
        </section>
      </div>
    </div>
  );
}
