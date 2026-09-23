/** Consistent table surface */
export default function DataTable({ children, className = "" }) {
  return (
    <div className={`data-table-wrap ${className}`.trim()}>
      <div className="table-responsive">
        <table className="table table-sm table-hover data-table mb-0">{children}</table>
      </div>
    </div>
  );
}
