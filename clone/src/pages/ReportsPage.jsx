import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/AuthContext";
import { reportService } from "../services/index.js";

export default function ReportsPage() {
  const { notify } = useOutletContext();
  const { user, can } = useAuth();
  const [category, setCategory] = useState("All");
  const [from, setFrom] = useState("2026-04-01");
  const [to, setTo] = useState("2026-09-14");
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);

  useEffect(() => {
    reportService.listCatalog(category).then((list) => {
      setCatalog(list);
      setSelected((prev) => list.find((r) => r.id === prev?.id) || list[0] || null);
    });
  }, [category]);

  useEffect(() => {
    reportService.getDashboard().then((d) => {
      setMetrics(d.metrics);
      setCharts(d.charts);
    });
  }, []);

  async function exportCsv() {
    if (!can("report.export")) {
      notify("Export requires report.export permission.", "info");
      return;
    }
    const blob = await reportService.exportCsv(user?.name);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gfrpt-demo-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Demo CSV exported locally.");
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and preview demonstration reports."
        breadcrumb="Reporting / Reports"
        actions={
          <button type="button" className="btn btn-outline-primary btn-sm" id="exportReportBtn" onClick={exportCsv}>
            <i className="fas fa-download mr-1" /> Export CSV
          </button>
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="form-row align-items-end">
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="rptCategory">
                Category
              </label>
              <select id="rptCategory" className="form-control form-control-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>All</option>
                <option>Performance</option>
                <option>Operations</option>
                <option>Administration</option>
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="rptFrom">
                From
              </label>
              <input id="rptFrom" type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="rptTo">
                To
              </label>
              <input id="rptTo" type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="form-group col-md-3 mb-2">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => notify(`Preview refreshed for ${from} → ${to}.`)}>
                Apply range
              </button>
            </div>
          </div>
        </div>
      </div>

      {metrics && (
        <div className="row mb-3">
          <div className="col-md-3 mb-2">
            <div className="card summary-tile h-100">
              <div className="card-body">
                <div className="text-muted small">Total</div>
                <div className="h4 mb-0">{metrics.total}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-2">
            <div className="card summary-tile h-100">
              <div className="card-body">
                <div className="text-muted small">Approved</div>
                <div className="h4 mb-0 text-success">{metrics.approved}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-2">
            <div className="card summary-tile h-100">
              <div className="card-body">
                <div className="text-muted small">Completed</div>
                <div className="h4 mb-0">{metrics.completed}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-2">
            <div className="card summary-tile h-100">
              <div className="card-body">
                <div className="text-muted small">Performance</div>
                <div className="h4 mb-0">{metrics.performanceRate}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-header">Report catalog</div>
            <div className="list-group list-group-flush">
              {catalog.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  className={`list-group-item list-group-item-action ${selected?.id === r.id ? "active" : ""}`}
                  onClick={() => setSelected(r)}
                >
                  <div className="d-flex justify-content-between">
                    <strong className="small">{r.title}</strong>
                    <span className="badge badge-light border">{r.category}</span>
                  </div>
                  <div className="small mt-1" style={{ opacity: 0.85 }}>
                    {r.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="col-lg-8 mb-3">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>{selected?.title || "Preview"}</span>
              <span className="small text-muted">Updated {selected?.updated}</span>
            </div>
            <div className="card-body">
              <p className="text-muted small">{selected?.description}</p>
              <div className="chart-box" id="reportChart">
                {charts && (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={charts.overTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="completed" fill="#3490dc" name="Completed" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="approved" fill="#38c172" name="Approved" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
