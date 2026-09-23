export default function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div className="page-header d-flex justify-content-between align-items-start flex-wrap mb-3">
      <div>
        {breadcrumb && <div className="page-breadcrumb text-muted small mb-1">{breadcrumb}</div>}
        <h4 className="page-title mb-0">{title}</h4>
        {subtitle && <p className="text-muted small mb-0 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions page-actions mt-2 mt-md-0 d-flex flex-wrap">{actions}</div>}
    </div>
  );
}
