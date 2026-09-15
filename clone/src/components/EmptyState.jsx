export default function EmptyState({ icon = "fas fa-inbox", title, message, action }) {
  return (
    <div className="empty-state text-center py-5 px-3">
      <div className="empty-state-icon mb-3">
        <i className={icon} />
      </div>
      <h6 className="mb-1">{title}</h6>
      {message && <p className="text-muted small mb-3">{message}</p>}
      {action}
    </div>
  );
}
