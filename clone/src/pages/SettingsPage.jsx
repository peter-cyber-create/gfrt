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

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function SettingsPage() {
  const { notify } = useOutletContext();
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [audits, setAudits] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    reportService.getPreferences().then(setPrefs);
    auditService.list(12).then(setAudits);
  }, [tab]);

  async function savePrefs(e) {
    e.preventDefault();
    const next = await reportService.savePreferences(prefs, user?.name);
    setPrefs(next);
    notify("Preferences saved.");
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword);
      if (!result?.ok) {
        setPasswordError(result?.message || "Unable to change password.");
        return;
      }
      setPasswordForm(emptyPasswordForm);
      setPasswordMessage(result.message || "Password updated.");
      notify("Password updated.");
      if (result.requiresReLogin) {
        await logout();
        navigate("/login");
      }
    } catch (err) {
      setPasswordError(err?.message || "Unable to change password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleReset() {
    if (!DEMO_MODE && !STAGING_PRESENTATION_RESET) return;
    setResetting(true);
    try {
      await resetDemoData(user?.name);
      if (STAGING_PRESENTATION_RESET && !DEMO_MODE) {
        notify("Staging data restored. Please sign in again.");
        await logout();
        navigate("/login");
        return;
      }
      setPrefs(await reportService.getPreferences());
      setAudits(await auditService.list(12));
      notify("Data restored.");
    } catch (err) {
      notify(err?.message || "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" />

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
                {getDataSource() === "api" ? "API" : "Local"}
              </dd>
              <dt className="col-sm-3">Permissions</dt>
              <dd className="col-sm-9">{(user?.permissions || []).length} granted</dd>
            </dl>
          </div>
        </div>
      )}

      {tab === "preferences" && (
        <div className="card">
          <div className="card-header">Preferences</div>
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
                    Email digest
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
                  Save changes
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
              <div className="card-header">Change password</div>
              <div className="card-body">
                {passwordError && (
                  <div className="alert alert-danger py-2" data-testid="change-password-error">
                    {passwordError}
                  </div>
                )}
                {passwordMessage && (
                  <div className="alert alert-success py-2" data-testid="change-password-success">
                    {passwordMessage}
                  </div>
                )}
                <form onSubmit={handleChangePassword} data-testid="change-password-form" autoComplete="off">
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current password</label>
                    <input
                      id="currentPassword"
                      type="password"
                      className="form-control"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newPassword">New password</label>
                    <input
                      id="newPassword"
                      type="password"
                      className="form-control"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm new password</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="form-control"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={passwordBusy} data-testid="change-password-submit">
                    {passwordBusy ? "Saving…" : "Change password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-6 mb-3">
            <div className="card mb-3">
              <div className="card-header">Application</div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-sm-4">Name</dt>
                  <dd className="col-sm-8">{APP_NAME}</dd>
                  <dt className="col-sm-4">Environment</dt>
                  <dd className="col-sm-8">{DEMO_MODE ? "Local" : STAGING_PRESENTATION_RESET ? "Staging" : "Standard"}</dd>
                  <dt className="col-sm-4">Data source</dt>
                  <dd className="col-sm-8" data-testid="data-source">
                    {getDataSource() === "api" ? "API" : "Local"}
                  </dd>
                </dl>
              </div>
            </div>
            {(DEMO_MODE || STAGING_PRESENTATION_RESET) && (
              <div className="card">
                <div className="card-header">Reset application data</div>
                <div className="card-body">
                  <p className="text-muted small mb-3">
                    Restores the initial dataset{DEMO_MODE ? " and local passwords" : ""}. Does not affect live systems.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    id="resetDemoBtn"
                    disabled={resetting}
                    onClick={handleReset}
                  >
                    {resetting ? "Resetting…" : "Reset application data"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="card">
          <div className="card-header">Audit</div>
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
