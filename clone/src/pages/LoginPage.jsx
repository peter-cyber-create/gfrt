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
  const [demoLoading, setDemoLoading] = useState("");
  const [presentationAccounts, setPresentationAccounts] = useState([]);

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "false") return undefined;
    let cancelled = false;
    import("../services/mock/authService.js").then((mod) => {
      if (!cancelled) setPresentationAccounts(mod.DEMO_PRESENTATION_ACCOUNTS || []);
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
        setDemoLoading("");
        if (!result.ok) {
          setError(result.message);
          return;
        }
        void remember;
        navigate("/home");
      })
      .catch(() => {
        setLoading(false);
        setDemoLoading("");
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

  function onPresentationLogin(account) {
    setEmail(account.username);
    setPassword(account.password);
    setDemoLoading(account.id);
    runLogin(account.username, account.password);
  }

  function onStagingDemoLogin(account) {
    if (!STAGING_QUICK_LOGIN || !STAGING_DEMO_PASSWORD) {
      setError("Quick sign-in is not enabled in this build.");
      return;
    }
    setEmail(account.email);
    setDemoLoading(account.id);
    runLogin(account.email, STAGING_DEMO_PASSWORD);
  }

  return (
    <main className="login-page">
      <div className="login-panel">
        <div className="login-panel-head">
          <img src={assetUrl("img/coa2.png")} alt="" height="40" width="40" />
          <div>
            <div className="login-app-name">{APP_NAME}</div>
            <div className="login-app-meta text-muted">Sign in to continue</div>
          </div>
        </div>

        <div className="login-panel-body">
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <form method="post" action="#" onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Username</label>
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

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

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
                <label className="form-check-label small" htmlFor="remember">
                  Remember me
                </label>
              </div>
              <Link className="small" to="/password/reset">
                Forgot password?
              </Link>
            </div>
          </form>

          {DEMO_MODE && presentationAccounts.length > 0 && (
            <div className="demo-quick-login" data-testid="demo-quick-login">
              <div className="demo-quick-login-label">Demo accounts</div>
              <div className="demo-quick-login-actions">
                {presentationAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    id={`demo-login-${account.id}`}
                    disabled={loading}
                    onClick={() => onPresentationLogin(account)}
                  >
                    {demoLoading === account.id ? "…" : account.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {STAGING_QUICK_LOGIN && (
            <div className="demo-quick-login" data-testid="staging-quick-login">
              <div className="demo-quick-login-label">Quick sign-in</div>
              <div className="demo-quick-login-actions">
                {STAGING_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={loading}
                    onClick={() => onStagingDemoLogin(account)}
                  >
                    {demoLoading === account.id ? "Signing in…" : account.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
