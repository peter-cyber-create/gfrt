import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { APP_NAME, DEMO_MODE } from "../data/mock";
import DemoBadge from "../components/DemoBadge";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/home" replace />;

  function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    login(email, password)
      .then((result) => {
        setLoading(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        void remember;
        navigate("/home");
      })
      .catch(() => {
        setLoading(false);
        setError("Login failed.");
      });
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
          </div>
        </div>
      </div>
    </main>
  );
}
