import type { ReactNode } from 'react';

type SectionCardProps = {
  title?: string;
  badge?: string | number | null;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function SectionCard({
  title,
  badge,
  subtitle,
  children,
  className = '',
  id,
}: SectionCardProps) {
  return (
    <section id={id} className={`section-card${className ? ` ${className}` : ''}`}>
      {title ? (
        <div className="section-head">
          <div className="section-head-text">
            <h2 className="section-title">{title}</h2>
            {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
          </div>
          {badge != null && badge !== '' ? <span className="section-badge">{badge}</span> : null}
        </div>
      ) : null}
      <div className="section-body">{children}</div>
    </section>
  );
}
