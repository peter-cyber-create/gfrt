import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import LoadingState from "../components/LoadingState";
import { APP_NAME, DEMO_MODE, STAGING_PRESENTATION_RESET } from "../data/mock";
import { useAuth } from "../auth/AuthContext";
import { auditService, getDataSource, reportService, resetDemoData } from "../services/index.js";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Security" },
  { id: "audit", label: "Audit" },
];

export default function SettingsPage() {
  const { notify } = useOutletContext();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [audits, setAudits] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    reportService.getPreferences().then(setPrefs);
    auditService.list(12).then(setAudits);
  }, [tab]);

  async function savePrefs(e) {
    e.preventDefault();
    const next = await reportService.savePreferences(prefs, user?.name);
    setPrefs(next);
    notify("Preferences saved locally.");
  }

  async function handleReset() {
    if (!DEMO_MODE && !STAGING_PRESENTATION_RESET) return;
    setResetting(true);
    try {
      await resetDemoData(user?.name);
      if (STAGING_PRESENTATION_RESET && !DEMO_MODE) {
        notify("Staging presentation data restored. Please sign in again.");
        await logout();
        navigate("/login");
        return;
      }
      setPrefs(await reportService.getPreferences());
      setAudits(await auditService.list(12));
      notify("Demo data restored to the initial presentation dataset.");
    } catch (err) {
      notify(err?.message || "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" subtitle="Local presentation preferences — not production configuration." breadcrumb="System / Settings" />

      <ul className="nav nav-tabs settings-tabs mb-3" role="tablist">
        {TABS.map((t) => (
          <li className="nav-item" key={t.id}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`nav-link btn btn-link ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === "profile" && (
        <div className="card">
          <div className="card-header">Profile</div>
          <div className="card-body">
            <dl className="row mb-0">
              <dt className="col-sm-3">Name</dt>
              <dd className="col-sm-9">{user?.name}</dd>
              <dt className="col-sm-3">Email</dt>
              <dd className="col-sm-9">{user?.email}</dd>
              <dt className="col-sm-3">Role</dt>
              <dd className="col-sm-9">{user?.role}</dd>
              <dt className="col-sm-3">Data source</dt>
              <dd className="col-sm-9" data-testid="data-source">
                {getDataSource()}
              </dd>
              <dt className="col-sm-3">Permissions</dt>
              <dd className="col-sm-9">
                <span className="badge badge-light border">{(user?.permissions || []).length} granted</span>
              </dd>
            </dl>
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <div className="card">
          <div className="card-header">Appearance & notifications</div>
          <div className="card-body">
            {!prefs ? (
              <LoadingState />
            ) : (
              <form onSubmit={savePrefs}>
                <div className="form-group">
                  <label htmlFor="density">Table density</label>
                  <select
                    id="density"
                    className="form-control"
                    value={prefs.density}
                    onChange={(e) => setPrefs({ ...prefs, density: e.target.value })}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="emailDigest"
                    checked={!!prefs.emailDigest}
                    onChange={(e) => setPrefs({ ...prefs, emailDigest: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="emailDigest">
                    Email digest (local preference only)
                  </label>
                </div>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="inAppNotifications"
                    checked={!!prefs.inAppNotifications}
                    onChange={(e) => setPrefs({ ...prefs, inAppNotifications: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="inAppNotifications">
                    In-app notifications
                  </label>
                </div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save preferences
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="row">
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">Application</div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-sm-4">Name</dt>
                  <dd className="col-sm-8">{APP_NAME}</dd>
                  <dt className="col-sm-4">Environment</dt>
                  <dd className="col-sm-8">{DEMO_MODE ? "Presentation / Demo" : STAGING_PRESENTATION_RESET ? "Staging presentation" : "Standard"}</dd>
                  <dt className="col-sm-4">Data source</dt>
                  <dd className="col-sm-8" data-testid="data-source">
                    {getDataSource()}
                  </dd>
                  <dt className="col-sm-4">Production API</dt>
                  <dd className="col-sm-8">{DEMO_MODE ? "Disabled (demo mode)" : "Staging API connected"}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card h-100">
              <div className="card-header">{DEMO_MODE ? "Demo controls" : "Presentation controls"}</div>
              <div className="card-body">
                <p className="text-muted small">
                  {DEMO_MODE
                    ? "Reset restores the initial presentation dataset. It does not affect production."
                    : "Reset Demo Data restores the deterministic staging seed in PostgreSQL. It never touches musooka.site or production."}
                </p>
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  id="resetDemoBtn"
                  disabled={(!DEMO_MODE && !STAGING_PRESENTATION_RESET) || resetting}
                  onClick={handleReset}
                >
                  {resetting ? "Resetting…" : "Reset Demo Data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="card">
          <div className="card-header">Recent audit events</div>
          <div className="table-responsive">
            <table className="table table-sm mb-0" id="auditTable">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">User</th>
                  <th scope="col">Action</th>
                  <th scope="col">Entity</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td className="small">{a.timestamp}</td>
                    <td>{a.user}</td>
                    <td>
                      <code className="small">{a.action}</code>
                    </td>
                    <td className="small">
                      {a.entity}/{a.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
