/** Consistent table surface */
export default function DataTable({ children, className = "", mobileCards = false }) {
  return (
    <div className={`data-table-wrap table-scroll ${className}`.trim()}>
      <table
        className={`table table-sm table-hover data-table mb-0 ${mobileCards ? "table-mobile-cards" : ""}`.trim()}
      >
        {children}
      </table>
    </div>
  );
}
