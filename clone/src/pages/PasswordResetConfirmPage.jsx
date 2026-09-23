import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

    setBusy(true);
    try {
      await authService.confirmPasswordReset(token, password, confirm);
      setPassword("");
      setConfirm("");
      setMessage("Password updated. You can sign in with your new password.");
    } catch (err) {
      setError(err.message || "Unable to update password.");
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
              <div className="card-header">Set new password</div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" data-testid="reset-confirm-error">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="alert alert-success" data-testid="reset-confirm-message">
                    {message}
                  </div>
                )}
                <form method="post" action="#" onSubmit={onSubmit} data-testid="reset-confirm-form">
                  <div className="form-group row">
                    <label htmlFor="password" className="col-md-4 col-form-label text-md-right">
                      New password
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
                      Confirm password
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
                      <button type="submit" className="btn btn-primary" disabled={busy} data-testid="reset-confirm-submit">
                        {busy ? "Updating…" : "Update password"}
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
