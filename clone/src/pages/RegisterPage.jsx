import { useState } from "react";
import { Link } from "react-router-dom";
import { DEMO_MODE } from "../data/config.js";
import { getDataSource } from "../services/index.js";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const apiMode = !DEMO_MODE && getDataSource() === "api";

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (apiMode) {
      setError("Public self-registration is not enabled. Ask an administrator to create your account under Users.");
      return;
    }
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError("Password confirmation does not match.");
      return;
    }
    setMessage("Registration saved locally. No account was created on a remote server.");
  }

  return (
    <main className="py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">Register</div>
              <div className="card-body">
                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}
                {apiMode && (
                  <div className="alert alert-info">
                    Staging API mode does not allow public registration. Administrators create accounts from{" "}
                    <strong>Users</strong> after signing in.
                  </div>
                )}
                <form method="post" action="#" onSubmit={onSubmit}>
                  <div className="form-group row">
                    <label htmlFor="name" className="col-md-4 col-form-label text-md-right">
                      Name
                    </label>
                    <div className="col-md-6">
                      <input id="name" type="text" className="form-control" name="name" value={form.name} onChange={update("name")} required autoComplete="name" autoFocus disabled={apiMode} />
                    </div>
                  </div>
                  <div className="form-group row">
                    <label htmlFor="email" className="col-md-4 col-form-label text-md-right">
                      E-Mail Address
                    </label>
                    <div className="col-md-6">
                      <input id="email" type="email" className="form-control" name="email" value={form.email} onChange={update("email")} required autoComplete="email" disabled={apiMode} />
                    </div>
                  </div>
                  <div className="form-group row">
                    <label htmlFor="password" className="col-md-4 col-form-label text-md-right">
                      Password
                    </label>
                    <div className="col-md-6">
                      <input id="password" type="password" className="form-control" name="password" value={form.password} onChange={update("password")} required autoComplete="new-password" disabled={apiMode} />
                    </div>
                  </div>
                  <div className="form-group row">
                    <label htmlFor="password-confirm" className="col-md-4 col-form-label text-md-right">
                      Confirm Password
                    </label>
                    <div className="col-md-6">
                      <input id="password-confirm" type="password" className="form-control" name="password_confirmation" value={form.password_confirmation} onChange={update("password_confirmation")} required autoComplete="new-password" disabled={apiMode} />
                    </div>
                  </div>
                  <div className="form-group row mb-0">
                    <div className="col-md-6 offset-md-4">
                      <button type="submit" className="btn btn-primary" disabled={apiMode}>
                        Register
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
