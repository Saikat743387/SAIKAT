import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  adminLogin,
  fetchAdminDashboard,
  clearAdminToken,
} from "../../lib/adminApi.js";
import { playClick } from "../../lib/clickSound";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Already logged in? Redirect to dashboard.
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) navigate("/admin/dashboard");
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem("admin_username", data.admin.username);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>Galaxy Admin</h1>
          <p>Sign in to manage the app</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="admin-login-btn"
            disabled={loading}
            onClick={(e) => playClick()}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="admin-login-footer">
          <p className="muted">Protected area — authorized personnel only</p>
        </div>
      </div>
    </div>
  );
}
