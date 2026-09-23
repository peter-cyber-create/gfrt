import { useState } from "react";
import { Link } from "react-router-dom";
import { DEMO_MODE } from "../data/config.js";
import { authService } from "../services/index.js";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [demoPath, setDemoPath] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setDemoPath("");
    if (!email) {
      setError("Please enter your username or e-mail address.");
      return;
    }
    setBusy(true);
    try {
      const result = await authService.requestPasswordReset(email);
      const path = result?.data?.demoResetPath || "";
      if (DEMO_MODE) {
        setMessage(
          path
            ? "Reset link created. No email is sent in this environment."
            : "If that account exists, a reset link would be issued. No email is sent in this environment."
        );
        if (path) setDemoPath(path);
      } else {
        setMessage("If that email exists, a reset link has been sent.");
      }
    } catch (err) {
      setError(err.message || "Unable to request password reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">Reset password</div>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {message && (
                  <div className="alert alert-success" data-testid="reset-request-message">
                    {message}
                    {demoPath && (
                      <div className="mt-2">
                        <Link to={demoPath} data-testid="demo-reset-link">
                          Continue to set a new password
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                <form method="post" action="#" onSubmit={onSubmit}>
                  <div className="form-group row">
                    <label htmlFor="email" className="col-md-4 col-form-label text-md-right">
                      Username or email
                    </label>
                    <div className="col-md-6">
                      <input
                        id="email"
                        type="text"
                        className="form-control"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        autoFocus
                        placeholder="admin"
                      />
                    </div>
                  </div>
                  <div className="form-group row mb-0">
                    <div className="col-md-6 offset-md-4">
                      <button type="submit" className="btn btn-primary" disabled={busy} data-testid="reset-request-submit">
                        {busy ? "Sending…" : "Send reset link"}
                      </button>
                      <Link to="/login" className="btn btn-link">
                        Back to login
                      </Link>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
