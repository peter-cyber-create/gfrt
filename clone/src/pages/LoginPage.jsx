import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { APP_NAME, DEMO_MODE, STAGING_DEMO_PASSWORD, STAGING_QUICK_LOGIN } from "../data/mock";
import { assetUrl } from "../lib/assetUrl.js";

const STAGING_ACCOUNTS = [
  { id: "admin", label: "Administrator", email: "admin@gfrt.local" },
  { id: "reviewer", label: "Reviewer", email: "reviewer@gfrt.local" },
  { id: "user", label: "User", email: "user@gfrt.local" },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(STAGING_QUICK_LOGIN ? "admin@gfrt.local" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState("");
  const [quickAccounts, setQuickAccounts] = useState([]);

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "false") return undefined;
    let cancelled = false;
    import("../services/mock/authService.js").then((mod) => {
      if (!cancelled) setQuickAccounts(mod.DEMO_PRESENTATION_ACCOUNTS || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthenticated) return <Navigate to="/home" replace />;

  function runLogin(nextEmail, nextPassword) {
    setError("");
    setLoading(true);
    return login(nextEmail, nextPassword)
      .then((result) => {
        setLoading(false);
        setQuickLoading("");
        if (!result.ok) {
          setError(result.message);
          return;
        }
        void remember;
        navigate("/home");
      })
      .catch(() => {
        setLoading(false);
        setQuickLoading("");
        setError("Login failed.");
      });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Username and password are required.");
      return;
    }
    runLogin(email, password);
  }

  function onQuickLogin(account) {
    setEmail(account.username);
    setPassword(account.password);
    setQuickLoading(account.id);
    runLogin(account.username, account.password);
  }

  function onStagingQuickLogin(account) {
    if (!STAGING_QUICK_LOGIN || !STAGING_DEMO_PASSWORD) {
      setError("Quick access is not enabled in this build.");
      return;
    }
    setEmail(account.email);
    setQuickLoading(account.id);
    runLogin(account.email, STAGING_DEMO_PASSWORD);
  }

  const showQuickAccess = (DEMO_MODE && quickAccounts.length > 0) || STAGING_QUICK_LOGIN;

  return (
    <main className="login-page">
      <div className="login-shell">
        <aside className="login-brand" aria-label="Application identity">
          <img src={assetUrl("img/coa2.png")} alt="" className="login-brand-mark" width="56" height="56" />
          <p className="login-brand-kicker">GFRT</p>
          <h1 className="login-brand-title">{APP_NAME}</h1>
          <p className="login-brand-copy">
            Sign in to manage requisitions, approvals, and performance reporting.
          </p>
        </aside>

        <div className="login-panel">
          <div className="login-panel-head">
            <h2 className="login-panel-title">Sign in</h2>
            <p className="login-panel-meta text-muted">Enter your account credentials to continue.</p>
          </div>

          <div className="login-panel-body">
            {error && (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            )}

            <form method="post" action="#" onSubmit={onSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Username or email</label>
                <input
                  id="email"
                  type="text"
                  className={`form-control ${error ? "is-invalid" : ""}`}
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <i className={`fas fa-eye${showPassword ? "-slash" : ""}`} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="login-secondary-row">
                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="remember"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="remember">
                    Remember me
                  </label>
                </div>
                <Link to="/password/reset">Forgot password?</Link>
              </div>

              <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {showQuickAccess && (
              <div className="demo-quick-login" data-testid="demo-quick-login">
                <div className="demo-quick-login-label">Quick access</div>
                <div className="demo-quick-login-actions">
                  {DEMO_MODE &&
                    quickAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        id={`demo-login-${account.id}`}
                        disabled={loading}
                        onClick={() => onQuickLogin(account)}
                      >
                        {quickLoading === account.id ? "…" : account.label}
                      </button>
                    ))}
                  {STAGING_QUICK_LOGIN &&
                    STAGING_ACCOUNTS.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        data-testid="staging-quick-login"
                        disabled={loading}
                        onClick={() => onStagingQuickLogin(account)}
                      >
                        {quickLoading === account.id ? "Signing in…" : account.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
