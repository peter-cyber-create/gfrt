import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import LoadingState from "../components/LoadingState";
import { reportService } from "../services/index.js";

const PIE_COLORS = ["#3490dc", "#6cb2eb", "#f6993f", "#38c172", "#343a40", "#e3342f"];

function Trend({ trend }) {
  if (!trend) return null;
  const up = trend.direction === "up";
  return (
    <span className={`kpi-trend ${up ? "up" : "down"}`}>
      <i className={`fas fa-arrow-${up ? "up" : "down"}`} aria-hidden="true" /> {trend.value}%
    </span>
  );
}

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
        <PageHeader title="Dashboard" breadcrumb="Home / Dashboard" />
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!dash) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Loading…" breadcrumb="Home / Dashboard" />
        <LoadingState label="Loading dashboard…" />
      </div>
    );
  }

  const { metrics, charts, activities, recentRequisitions } = dash;
  const kpis = [
    { key: "total", label: "Total Requisitions", value: metrics.total, icon: "fas fa-folder-open", tone: "primary" },
    { key: "pending", label: "Processing", value: metrics.processing, icon: "fas fa-sync", tone: "warning" },
    { key: "underReview", label: "Under Review", value: metrics.underReview, icon: "fas fa-search", tone: "info" },
    { key: "approved", label: "Approved", value: metrics.approved, icon: "fas fa-check-circle", tone: "success" },
    { key: "completed", label: "Completed", value: metrics.completed, icon: "fas fa-flag-checkered", tone: "info" },
    { key: "rejected", label: "Rejected", value: metrics.rejected, icon: "fas fa-times-circle", tone: "secondary" },
  ];

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title="Dashboard"
        subtitle="Live figures from staging requisitions."
        breadcrumb="Home / Dashboard"
      />

      <div className="row">
        {kpis.map((kpi) => (
          <div className="col-xl-2 col-md-4 col-sm-6 mb-3" key={kpi.key}>
            <div className={`card kpi-card border-left-${kpi.tone} h-100`} data-kpi={kpi.key}>
              <div className="card-body py-3">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="kpi-label">{kpi.label}</div>
                    <div className="kpi-value">{kpi.value}</div>
                    <Trend trend={metrics.trends?.[kpi.key]} />
                  </div>
                  <i className={`${kpi.icon} kpi-icon text-${kpi.tone}`} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row mb-2">
        <div className="col-md-4 mb-2">
          <div className="card summary-tile h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Performance rate</div>
              <div className="h4 mb-0">{metrics.performanceRate}%</div>
              <div className="small text-muted">(Approved + Completed) / Total</div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-2">
          <div className="card summary-tile h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Approval rate</div>
              <div className="h4 mb-0">{metrics.approvalRate}%</div>
              <div className="small text-muted">Among closed decisions</div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-2">
          <div className="card summary-tile h-100">
            <div className="card-body py-3">
              <div className="text-muted small">Pending workload</div>
              <div className="h4 mb-0">{metrics.pendingWorkload}</div>
              <div className="small text-muted">Submitted + Review + Processing</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-3">
          <div className="card h-100">
            <div className="card-header">Requisition trend</div>
            <div className="card-body chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={charts.overTime}>
                  <defs>
                    <linearGradient id="cSubmit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3490dc" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3490dc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="submitted" stroke="#3490dc" fill="url(#cSubmit)" />
                  <Area type="monotone" dataKey="approved" stroke="#38c172" fill="transparent" />
                  <Area type="monotone" dataKey="completed" stroke="#6cb2eb" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-header">Status distribution</div>
            <div className="card-body chart-box">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={charts.byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {charts.byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-5 mb-3">
          <div className="card h-100">
            <div className="card-header">Departmental performance</div>
            <div className="card-body chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.byDepartment} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#3490dc" radius={[0, 3, 3, 0]} name="Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-7 mb-3">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Recent activity</span>
              <span className="badge badge-light border">Demo</span>
            </div>
            <div className="list-group list-group-flush activity-list">
              {activities.slice(0, 6).map((a) => (
                <div className="list-group-item activity-item" key={a.id}>
                  <div className={`activity-dot type-${a.type}`} />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <strong className="small">{a.title}</strong>
                      <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {a.time}
                      </span>
                    </div>
                    <div className="text-muted small">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Recent requisitions</div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Facility</th>
                <th scope="col">Department</th>
                <th scope="col">Status</th>
                <th scope="col">Amount</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentRequisitions.map((row) => (
                <tr key={row.id}>
                  <td className="font-monospace small">{row.id}</td>
                  <td>{row.facility}</td>
                  <td>{row.department}</td>
                  <td>
                    <StatusBadge status={row.status} statusCode={row.statusCode} />
                  </td>
                  <td>{row.amount}</td>
                  <td>{row.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
