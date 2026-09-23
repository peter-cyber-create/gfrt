export default function ActivityList({ items = [], empty = "No recent activity." }) {
  if (!items.length) {
    return <div className="activity-list empty text-muted small p-3">{empty}</div>;
  }
  return (
    <div className="list-group list-group-flush activity-list">
      {items.map((a) => (
        <div className="list-group-item activity-item" key={a.id}>
          <div className={`activity-dot type-${a.type || "default"}`} />
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between">
              <strong className="small">{a.title}</strong>
              <span className="text-muted meta-text">{a.time}</span>
            </div>
            <div className="text-muted small">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
