import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import LoadingState from "../components/LoadingState";
import Metric from "../components/Metric";
import ActivityList from "../components/ActivityList";
import DataTable from "../components/DataTable";
import { reportService } from "../services/index.js";

const STATUS_COLORS = {
  Draft: "#667085",
  Submitted: "#176B87",
  Processing: "#A66A00",
  "Under Review": "#176B87",
  Approved: "#287D4A",
  Completed: "#17202A",
  Rejected: "#B42318",
  Cancelled: "#667085",
};

export default function HomePage() {
  const [dash, setDash] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    reportService
      .getDashboard()
      .then(setDash)
      .catch(() => setError("Unable to load dashboard."));
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!dash) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <LoadingState label="Loading dashboard…" />
      </div>
    );
  }

  const { metrics, charts, activities, recentRequisitions } = dash;
  const kpis = [
    { key: "total", label: "Total", value: metrics.total },
    { key: "approved", label: "Approved", value: metrics.approved, tone: "success" },
    { key: "underReview", label: "Under review", value: metrics.underReview, tone: "warning" },
    { key: "pending", label: "Processing", value: metrics.processing, tone: "warning" },
    { key: "submitted", label: "Submitted", value: metrics.submitted || 0 },
    { key: "rejected", label: "Rejected", value: metrics.rejected, tone: "danger" },
  ];

  return (
    <div data-testid="dashboard-page">
      <PageHeader title="Dashboard" subtitle="Requisition operations overview." />

      <div className="metric-row">
        {kpis.map((kpi) => (
          <Metric key={kpi.key} testId={kpi.key} label={kpi.label} value={kpi.value} tone={kpi.tone} />
        ))}
      </div>

      <div className="row ops-grid">
        <div className="col-lg-8 mb-3">
          <div className="panel">
            <div className="panel-header">Recent requisitions</div>
            <DataTable>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Department</th>
                  <th scope="col">Requester</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentRequisitions.map((row) => (
                  <tr key={row.id}>
                    <td className="font-monospace small">{row.number || row.id}</td>
                    <td>{row.department}</td>
                    <td>{row.requester}</td>
                    <td>{row.amount}</td>
                    <td>
                      <StatusBadge status={row.status} statusCode={row.statusCode} />
                    </td>
                    <td className="meta-text">{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </div>

        <div className="col-lg-4 mb-3">
          <div className="panel h-100">
            <div className="panel-header">Status distribution</div>
            <div className="panel-body chart-box-sm">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts.byStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={1}>
                    {charts.byStatus.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || "#667085"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Recent activity</div>
        <ActivityList items={activities.slice(0, 8)} />
      </div>
    </div>
  );
}
