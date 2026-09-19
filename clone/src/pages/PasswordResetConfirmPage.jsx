import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DEMO_MODE } from "../data/config.js";
import { authService } from "../services/index.js";

export default function PasswordResetConfirmPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (DEMO_MODE) {
      setMessage("In demo mode, password reset is not sent to the API.");
      return;
    }

    setBusy(true);
    try {
      await authService.confirmPasswordReset(token, password);
      setMessage("Password updated. You can sign in with your new password.");
    } catch (err) {
      setError(err.message || "Unable to reach the API.");
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
              <div className="card-header">Confirm Password Reset</div>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}
                <form method="post" action="#" onSubmit={onSubmit}>
                  <div className="form-group row">
                    <label htmlFor="password" className="col-md-4 col-form-label text-md-right">
                      New Password
                    </label>
                    <div className="col-md-6">
                      <input
                        id="password"
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="form-group row">
                    <label htmlFor="confirm" className="col-md-4 col-form-label text-md-right">
                      Confirm Password
                    </label>
                    <div className="col-md-6">
                      <input
                        id="confirm"
                        type="password"
                        className="form-control"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div className="form-group row mb-0">
                    <div className="col-md-6 offset-md-4">
                      <button type="submit" className="btn btn-primary" disabled={busy}>
                        Update Password
                      </button>
                      <Link to="/login" className="btn btn-link">
                        Back to Login
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
