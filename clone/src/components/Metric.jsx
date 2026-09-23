/** Compact operational metric tile */
export default function Metric({ label, value, tone = "neutral", testId }) {
  return (
    <div className={`metric metric-${tone}`} data-kpi={testId || undefined}>
      <div className="metric-label">{label}</div>
      <div className="metric-value kpi-value">{value}</div>
    </div>
  );
}
