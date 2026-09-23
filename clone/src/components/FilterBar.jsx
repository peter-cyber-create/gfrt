/** Thin filter toolbar wrapper for consistent layout */
export default function FilterBar({ children, actions }) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-fields">{children}</div>
      {actions && <div className="filter-bar-actions">{actions}</div>}
    </div>
  );
}
