import { STATUS_CODE_TO_LABEL } from "../data/config.js";

export default function StatusTimeline({ history = [] }) {
  if (!history.length) {
    return <p className="text-muted small mb-0">No status history yet.</p>;
  }
  const items = [...history].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return (
    <ol className="status-timeline" aria-label="Status history">
      {items.map((h) => (
        <li key={h.id} className="status-timeline-item">
          <div className="status-timeline-marker" aria-hidden="true" />
          <div className="status-timeline-body">
            <div className="d-flex justify-content-between flex-wrap">
              <strong className="small">
                {STATUS_CODE_TO_LABEL[h.fromStatus] || h.fromStatus} → {STATUS_CODE_TO_LABEL[h.toStatus] || h.toStatus}
              </strong>
              <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                {String(h.at).replace("T", " ").slice(0, 16)}
              </span>
            </div>
            <div className="small text-muted">{h.actor}</div>
            {h.note && <div className="small mt-1">{h.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
