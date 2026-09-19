import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { APP_NAME, DEMO_MODE, STAGING_DEMO_PASSWORD, STAGING_QUICK_LOGIN } from "../data/mock";
import DemoBadge from "../components/DemoBadge";

const DEMO_ACCOUNTS = [
  { id: "admin", label: "Admin Demo", email: "admin@gfrt.local" },
  { id: "reviewer", label: "Reviewer Demo", email: "reviewer@gfrt.local" },
  { id: "user", label: "User Demo", email: "user@gfrt.local" },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(STAGING_QUICK_LOGIN ? "admin@gfrt.local" : "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState("");

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
      setError("Email and password are required.");
      return;
    }
    runLogin(email, password);
  }

  function onDemoLogin(account) {
    if (!STAGING_QUICK_LOGIN || !STAGING_DEMO_PASSWORD) {
      setError("Demo login is not enabled in this build.");
      return;
    }
    setEmail(account.email);
    setDemoLoading(account.id);
    runLogin(account.email, STAGING_DEMO_PASSWORD);
  }

  return (
    <main className="py-4 login-page">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5" style={{ marginTop: 80 }}>
            <div className="text-right mb-2">
              <DemoBadge />
            </div>
            <div className="card shadow-sm">
              <div className="card-header">Login</div>
              <div className="card-body">
                <div className="text-center mb-4">
                  <img src="/img/coa2.png" alt="Coat of Arms of Uganda" />
                  <br />
                  <span>{APP_NAME}</span>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                {STAGING_QUICK_LOGIN && (
                  <div className="mb-3" data-testid="staging-quick-login">
                    <p className="small text-muted mb-2">
                      Demo / Presentation Login — authenticates through the staging API (no auth bypass).
                    </p>
                    <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                      {DEMO_ACCOUNTS.map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          id={`demo-login-${account.id}`}
                          disabled={loading}
                          onClick={() => onDemoLogin(account)}
                        >
                          {demoLoading === account.id ? "Signing in…" : account.label}
                        </button>
                      ))}
                    </div>
                    <hr className="my-3" />
                  </div>
                )}

                <form method="post" action="#" onSubmit={onSubmit} noValidate>
                  <div className="form-group row pl-3">
                    <div className="input-group-prepend">
                      <span className="input-group-text">
                        <i className="fas fa-user" />
                      </span>
                    </div>
                    <div className="col-md-10">
                      <input
                        id="email"
                        type="email"
                        className={`form-control ${error ? "is-invalid" : ""}`}
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                        placeholder="Email"
                      />
                    </div>
                  </div>

                  <div className="form-group row pl-3">
                    <div className="input-group-prepend">
                      <span className="input-group-text">
                        <i className="fas fa-lock" />
                      </span>
                    </div>
                    <div className="col-md-10">
                      <input
                        id="password"
                        type="password"
                        className="form-control"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="Password"
                      />
                    </div>
                  </div>

                  <div className="form-group row mb-0">
                    <div className="col-md-5 text-left">
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true" />
                            Logging in…
                          </>
                        ) : (
                          "Login"
                        )}
                      </button>
                    </div>
                    <div className="col-md-6 text-right">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="remember"
                          id="remember"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="remember">
                          Remember Me
                        </label>
                      </div>
                      <Link className="btn btn-link" to="/password/reset" style={{ paddingRight: 0 }}>
                        Forgot Your Password?
                      </Link>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            {DEMO_MODE && (
              <p className="text-center text-muted small mt-3 mb-0">
                Local presentation login — credentials from environment variables only.
              </p>
            )}
            {STAGING_QUICK_LOGIN && (
              <p className="text-center text-muted small mt-3 mb-0">
                Staging presentation — quick login uses real backend sessions.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
