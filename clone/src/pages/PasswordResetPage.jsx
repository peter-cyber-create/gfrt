import { useState } from "react";
import { Link } from "react-router-dom";
import { DEMO_MODE } from "../data/config.js";
import { authService } from "../services/index.js";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your e-mail address.");
      return;
    }
    if (DEMO_MODE) {
      setMessage(
        "If that email exists, a reset link would be sent. In this presentation clone, no email is sent."
      );
      return;
    }
    setBusy(true);
    try {
      await authService.requestPasswordReset(email);
      setMessage("If that email exists, a reset link has been sent.");
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
              <div className="card-header">Reset Password</div>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}
                <form method="post" action="#" onSubmit={onSubmit}>
                  <div className="form-group row">
                    <label htmlFor="email" className="col-md-4 col-form-label text-md-right">
                      E-Mail Address
                    </label>
                    <div className="col-md-6">
                      <input
                        id="email"
                        type="email"
                        className="form-control"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="form-group row mb-0">
                    <div className="col-md-6 offset-md-4">
                      <button type="submit" className="btn btn-primary" disabled={busy}>
                        Send Password Reset Link
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
