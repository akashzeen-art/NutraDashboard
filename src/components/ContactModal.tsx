import type { ContactDetails } from '../types';

type ContactModalProps = {
  open: boolean;
  details: ContactDetails | null;
  onClose: () => void;
};

function dash(v: string | number | undefined): string {
  if (v === undefined || v === null) return '—';
  const s = String(v).trim();
  return s || '—';
}

export function ContactModal({ open, details, onClose }: ContactModalProps) {
  return (
    <div
      className={`modal${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content modal-content-wide">
        <button type="button" className="close-modal" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2>Customer details</h2>
        <div className="contact-details">
          <div className="detail-item">
            <span className="detail-label">Phone number</span>
            <span className="detail-value">{details?.phone || details?.mobile || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">First name</span>
            <span className="detail-value">
              {details?.firstName || details?.first_name || '—'}
            </span>
          </div>
          <div className="detail-item detail-item-divider">
            <span className="detail-label">Product info</span>
            <span className="detail-value">{dash(details?.productInfo)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Customer DSP</span>
            <span className="detail-value">{dash(details?.customerDsp)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Report DSP</span>
            <span className="detail-value">{dash(details?.lineReportDsp)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Domain</span>
            <span className="detail-value">{dash(details?.lineDomain)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Price</span>
            <span className="detail-value">{dash(details?.linePrice)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Product ID</span>
            <span className="detail-value">
              {details?.sourceProductId != null ? String(details.sourceProductId) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
