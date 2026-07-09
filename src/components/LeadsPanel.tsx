import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFormLeadsByDate } from '../api/formLeads';
import { fetchBucketWiseReport } from '../api/report';
import { DASHBOARD_PRODUCT_TABS, DATE_RANGE_MAX_DAYS, type DashboardProductTabId } from '../config';
import type { FormLeadRecord, ProductReport } from '../types';
import { uniqueProductIdsForTab } from '../utils/dashboardData';
import { formatDateDisplay, todayIsoDate } from '../utils/dateFormat';
import { enumerateInclusiveISODates } from '../utils/dateRange';
import { filterLeadsByProductId, filterLeadsForTab, uniqueLeadProductIds } from '../utils/formLeads';
import { LeadsSection } from './LeadsSection';

const ALL_PRODUCT_IDS = 'all';

function dayCount(from: string, to: string): number {
  const d0 = new Date(from + 'T12:00:00');
  const d1 = new Date(to + 'T12:00:00');
  const lo = d0 <= d1 ? d0 : d1;
  const hi = d0 <= d1 ? d1 : d0;
  return Math.floor((hi.getTime() - lo.getTime()) / 86400000) + 1;
}

export function LeadsPanel() {
  const today = todayIsoDate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activeProductTab, setActiveProductTab] = useState<DashboardProductTabId>('playTonight');
  const [productIdFilter, setProductIdFilter] = useState<string>(ALL_PRODUCT_IDS);
  const [reportData, setReportData] = useState<ProductReport[] | null>(null);
  const [rawLeads, setRawLeads] = useState<FormLeadRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [idsLoading, setIdsLoading] = useState(false);
  const [neverFetched, setNeverFetched] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idsError, setIdsError] = useState<string | null>(null);

  const rangeLabel = useMemo(() => {
    if (dateFrom === dateTo) return formatDateDisplay(dateFrom);
    return `${formatDateDisplay(dateFrom)} – ${formatDateDisplay(dateTo)}`;
  }, [dateFrom, dateTo]);

  const productIdOptions = useMemo(() => {
    const fromReport = reportData ? uniqueProductIdsForTab(reportData, activeProductTab) : [];
    const tabLeadsForIds =
      rawLeads && rawLeads.length > 0
        ? filterLeadsForTab(rawLeads, activeProductTab, reportData ?? [])
        : [];
    const fromLeads = uniqueLeadProductIds(tabLeadsForIds);
    return [...new Set([...fromReport, ...fromLeads])].sort((a, b) => a - b);
  }, [reportData, activeProductTab, rawLeads]);

  const displayedLeads = useMemo(() => {
    if (!rawLeads) return null;
    let rows = filterLeadsForTab(rawLeads, activeProductTab, reportData ?? []);
    if (productIdFilter !== ALL_PRODUCT_IDS) {
      const id = Number(productIdFilter);
      if (Number.isFinite(id)) rows = filterLeadsByProductId(rows, id);
    }
    return rows;
  }, [rawLeads, activeProductTab, reportData, productIdFilter]);

  useEffect(() => {
    if (productIdFilter === ALL_PRODUCT_IDS) return;
    const id = Number(productIdFilter);
    if (!productIdOptions.includes(id)) {
      setProductIdFilter(ALL_PRODUCT_IDS);
    }
  }, [productIdFilter, productIdOptions]);

  const loadProductIdsFromReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    const span = dayCount(dateFrom, dateTo);
    if (span > DATE_RANGE_MAX_DAYS) {
      setIdsError(`Date range cannot exceed ${DATE_RANGE_MAX_DAYS} days.`);
      setReportData([]);
      return;
    }

    setIdsLoading(true);
    setIdsError(null);
    try {
      const dates = enumerateInclusiveISODates(dateFrom, dateTo, DATE_RANGE_MAX_DAYS);
      const chunks = await Promise.all(dates.map((d) => fetchBucketWiseReport(d)));
      setReportData(chunks.flat());
    } catch (err) {
      console.error('Error loading product IDs from bucket-wise report:', err);
      setReportData([]);
      setIdsError('Could not load product IDs from bucket-wise report.');
    } finally {
      setIdsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void loadProductIdsFromReport();
  }, [loadProductIdsFromReport]);

  const handleFetchLeads = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      window.alert('Please select a date range');
      return;
    }
    const span = dayCount(dateFrom, dateTo);
    if (span > DATE_RANGE_MAX_DAYS) {
      window.alert(`Date range cannot exceed ${DATE_RANGE_MAX_DAYS} days.`);
      return;
    }

    const apiProductId = productIdFilter === ALL_PRODUCT_IDS ? null : Number(productIdFilter);

    setLoading(true);
    try {
      const leads = await fetchFormLeadsByDate(dateFrom, dateTo, apiProductId);
      setRawLeads(leads);
      setError(null);
      setNeverFetched(false);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setRawLeads([]);
      setError('Failed to load leads. Please check the console for details.');
      setNeverFetched(false);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, productIdFilter]);

  const productLabel = DASHBOARD_PRODUCT_TABS.find((t) => t.id === activeProductTab)?.label ?? 'Product';
  const selectedProductId = productIdFilter === ALL_PRODUCT_IDS ? null : Number(productIdFilter);
  const leadCount = displayedLeads?.length ?? 0;

  return (
    <div className="leads-view">
      {loading ? (
        <div className="loading-overlay loading-overlay-local" aria-busy="true" aria-live="polite">
          <div className="loading-spinner" />
          <span className="loading-text">Loading leads…</span>
        </div>
      ) : null}

      <div className="leads-toolbar dash-toolbar">
        <div className="leads-toolbar-callout">
          <p>
            Choose a product, set the date range, pick a <strong>Product ID</strong> from the bucket-wise
            report, then <strong>Fetch Leads</strong>.
          </p>
        </div>

        <div className="leads-toolbar-section">
          <span className="leads-step-label">Step 1 — Product</span>
          <div className="product-segment" role="group" aria-label="Product">
            {DASHBOARD_PRODUCT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`product-btn product-segment-btn${activeProductTab === tab.id ? ' active' : ''}`}
                onClick={() => {
                  setActiveProductTab(tab.id);
                  setProductIdFilter(ALL_PRODUCT_IDS);
                }}
                aria-pressed={activeProductTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="leads-toolbar-section leads-toolbar-filters">
          <span className="leads-step-label">Step 2 — Date range &amp; filters</span>
          <div className="leads-filter-grid">
            <div className="filter-field filter-field--date">
              <label htmlFor="leads-date-from">From</label>
              <input
                id="leads-date-from"
                type="date"
                className="date-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="filter-field filter-field--date">
              <label htmlFor="leads-date-to">To</label>
              <input
                id="leads-date-to"
                type="date"
                className="date-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="filter-field filter-field--product-id">
              <label htmlFor="leads-product-id">Product ID</label>
              <select
                id="leads-product-id"
                className="filter-select leads-product-id-select"
                value={productIdFilter}
                onChange={(e) => setProductIdFilter(e.target.value)}
                disabled={idsLoading}
              >
                <option value={ALL_PRODUCT_IDS}>All product IDs</option>
                {productIdOptions.map((id) => (
                  <option key={id} value={String(id)}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            <div className="leads-fetch-cell">
              <span className="leads-fetch-label" aria-hidden="true">
                &nbsp;
              </span>
              <button
                type="button"
                className="fetch-btn leads-fetch-btn"
                disabled={loading || idsLoading}
                onClick={() => void handleFetchLeads()}
              >
                {loading ? 'Loading…' : 'Fetch Leads'}
              </button>
            </div>
          </div>

          <p
            className={`leads-filter-meta${idsError ? ' leads-filter-meta--error' : ''}`}
            role="status"
            aria-live="polite"
          >
            {idsLoading
              ? 'Loading product IDs from bucket-wise report…'
              : idsError
                ? idsError
                : reportData && !productIdOptions.length
                  ? 'No product IDs in bucket-wise report for this product and date range.'
                  : 'Product IDs loaded from bucket-wise report API'}
          </p>
        </div>
      </div>

      {!neverFetched && !loading ? (
        <div className="kpi-strip" aria-label="Leads summary">
          <div className="kpi-card">
            <span className="kpi-label">Product</span>
            <span className="kpi-value">{productLabel}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Date range</span>
            <span className="kpi-value">{rangeLabel}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Product ID</span>
            <span className="kpi-value">{selectedProductId ?? 'All'}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Leads</span>
            <span className="kpi-value">{leadCount}</span>
          </div>
        </div>
      ) : null}

      <LeadsSection
        leads={displayedLeads}
        loading={loading}
        neverFetched={neverFetched}
        rangeLabel={rangeLabel}
        productLabel={productLabel}
        selectedProductId={selectedProductId}
        error={error}
      />
    </div>
  );
}
