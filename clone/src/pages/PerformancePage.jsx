import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { reportService } from "../services/index.js";

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    reportService
      .getPerformance()
      .then(setData)
      .catch(() => setError("Unable to load performance demonstration data."));
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Performance" breadcrumb="Operations / Performance" />
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Performance" breadcrumb="Operations / Performance" />
        <LoadingState />
      </div>
    );
  }

  const { metrics, processingTime, byDepartment, overTime } = data;

  return (
    <div data-testid="performance-page">
      <PageHeader
        title="Performance"
        subtitle="Indicators derived from local demonstration requisitions."
        breadcrumb="Operations / Performance"
      />

      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Completion rate</div>
              <div className="h3 mb-0">{metrics.completionRate}%</div>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-2">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Approval rate</div>
              <div className="h3 mb-0">{metrics.approvalRate}%</div>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-2">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Avg. processing time</div>
              <div className="h3 mb-0">{metrics.avgProcessingDays} days</div>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-2">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Pending workload</div>
              <div className="h3 mb-0">{metrics.pendingWorkload}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6 mb-3">
          <div className="card h-100">
            <div className="card-header">Processing time (weeks)</div>
            <div className="card-body chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={processingTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="days" stroke="#3490dc" strokeWidth={2} name="Days" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-3">
          <div className="card h-100">
            <div className="card-header">Department rates</div>
            <div className="card-body chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#38c172" radius={[3, 3, 0, 0]} name="Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Monthly completion trend</div>
        <div className="card-body chart-box">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={overTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#3490dc" name="Completed" />
              <Bar dataKey="approved" fill="#38c172" name="Approved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
