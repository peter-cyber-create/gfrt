import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../auth/AuthContext";
import { departmentService, reportService } from "../services/index.js";

const COLORS = ["#3490dc", "#6cb2eb", "#f6993f", "#38c172", "#343a40", "#e3342f"];

export default function AnalyticsPage() {
  const { notify } = useOutletContext();
  const { user, can } = useAuth();
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [period, setPeriod] = useState("2026-H2");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState([]);

  useEffect(() => {
    departmentService
      .list()
      .then((list) => setDepartmentOptions(list.map((d) => d.name)))
      .catch((err) => {
        setDepartmentOptions([]);
        if (err?.status && err.status !== 403) setError(err.message || "Unable to load departments.");
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    reportService
      .getAnalytics({ department, status, period })
      .then((next) => {
        setData(next);
        if (next?.departments?.length) setDepartmentOptions(next.departments);
      })
      .catch((err) => {
        setData(null);
        setError(err.message || "Unable to load analytics.");
      })
      .finally(() => setLoading(false));
  }, [department, status, period]);

  async function exportCsv() {
    if (!can("report.export")) {
      notify("Export requires report.export permission.", "info");
      return;
    }
    try {
      const blob = await reportService.exportCsv({ department, status, period });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gfrpt-analytics-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify("Analytics CSV exported.");
    } catch (err) {
      notify(err.message || "Export failed.", "danger");
    }
  }

  return (
    <div data-testid="analytics-page">
      <PageHeader
        title="Analytics"
        subtitle="Management view over staging requisition data."
        breadcrumb="Reporting / Analytics"
        actions={
          <button type="button" className="btn btn-outline-primary btn-sm" id="analyticsExportBtn" onClick={exportCsv}>
            <i className="fas fa-download mr-1" aria-hidden="true" /> Export
          </button>
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="form-row align-items-end">
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="anPeriod">
                Period
              </label>
              <select id="anPeriod" className="form-control form-control-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="2026-H1">2026 H1</option>
                <option value="2026-H2">2026 H2</option>
                <option value="2026-Q3">2026 Q3</option>
                <option value="2026-Q4">2026 Q4</option>
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="anDept">
                Department
              </label>
              <select id="anDept" className="form-control form-control-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option>All</option>
                {departmentOptions.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="anStatus">
                Status
              </label>
              <select id="anStatus" className="form-control form-control-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>All</option>
                <option>Submitted</option>
                <option>Under Review</option>
                <option>Processing</option>
                <option>Approved</option>
                <option>Completed</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : loading || !data ? (
        <LoadingState label="Loading analytics…" />
      ) : (
        <>
          <div className="row mb-3">
            <div className="col-md-3 mb-2">
              <div className="card summary-tile">
                <div className="card-body">
                  <div className="text-muted small">Records in filter</div>
                  <div className="h4 mb-0">{data.metrics.total}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card summary-tile">
                <div className="card-body">
                  <div className="text-muted small">Performance</div>
                  <div className="h4 mb-0">{data.metrics.performanceRate}%</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card summary-tile">
                <div className="card-body">
                  <div className="text-muted small">Approval rate</div>
                  <div className="h4 mb-0">{data.metrics.approvalRate}%</div>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-2">
              <div className="card summary-tile">
                <div className="card-body">
                  <div className="text-muted small">Completed</div>
                  <div className="h4 mb-0">{data.metrics.completed}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-7 mb-3">
              <div className="card h-100">
                <div className="card-header">Submission pipeline</div>
                <div className="card-body chart-box" id="analyticsChart">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.overTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="submitted" stackId="1" stroke="#3490dc" fill="#3490dc" fillOpacity={0.35} />
                      <Area type="monotone" dataKey="approved" stackId="1" stroke="#38c172" fill="#38c172" fillOpacity={0.35} />
                      <Area type="monotone" dataKey="completed" stackId="1" stroke="#6cb2eb" fill="#6cb2eb" fillOpacity={0.35} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-lg-5 mb-3">
              <div className="card h-100">
                <div className="card-header">Status mix (filtered)</div>
                <div className="card-body chart-box">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={data.byStatus} dataKey="value" nameKey="name" outerRadius={100}>
                        {data.byStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
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

          <div className="card">
            <div className="card-header">Department comparison</div>
            <div className="card-body chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#3490dc" name="Performance %" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
