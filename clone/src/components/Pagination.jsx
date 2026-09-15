export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <nav aria-label="Table pagination">
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
          <button type="button" className="page-link" onClick={() => onChange(page - 1)} disabled={page === 1}>
            Previous
          </button>
        </li>
        {items.map((n) => (
          <li key={n} className={`page-item ${n === page ? "active" : ""}`}>
            <button type="button" className="page-link" onClick={() => onChange(n)}>
              {n}
            </button>
          </li>
        ))}
        <li className={`page-item ${page === pages ? "disabled" : ""}`}>
          <button type="button" className="page-link" onClick={() => onChange(page + 1)} disabled={page === pages}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
