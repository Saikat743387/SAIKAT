import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { playClick } from "../../lib/clickSound";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const adminUsername = localStorage.getItem("admin_username");

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  function checkAuth() {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin");
    }
  }

  async function loadStats() {
    try {
      const token = localStorage.getItem("admin_token");
      const { data } = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      } else {
        setError("Failed to load dashboard stats");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    navigate("/admin");
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>📊 Admin Dashboard</h1>
          <p className="muted">Welcome back, {adminUsername}!</p>
        </div>
        <button onClick={(e) => {
          playClick();
          handleLogout();
        }} className="btn-logout">
          Logout
        </button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="admin-nav-link active">
          📊 Dashboard
        </Link>
        <Link to="/admin/users" className="admin-nav-link">
          👥 Users
        </Link>
        <Link to="/admin/withdrawals" className="admin-nav-link">
          💰 Withdrawals
        </Link>
        <Link to="/admin/referrals" className="admin-nav-link">
          🔗 Referrals
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats?.totalUsers?.toLocaleString() || 0}</h3>
            <p>Total Users</p>
            <span className="stat-badge">
              +{stats?.todayNewUsers || 0} today
            </span>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats?.totalCoinsInCirculation?.toLocaleString() || 0}</h3>
            <p>Total Coins</p>
            <span className="stat-badge">In circulation</span>
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats?.pendingWithdrawals || 0}</h3>
            <p>Pending Withdrawals</p>
            <span className="stat-badge">Needs attention</span>
          </div>
        </div>

        <div className="stat-card stat-info">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats?.successfulWithdrawals || 0}</h3>
            <p>Successful Withdrawals</p>
            <span className="stat-badge">Completed</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>📈 User Growth</h2>
        <div className="growth-cards">
          <div className="growth-card">
            <span className="growth-label">Last 7 Days</span>
            <span className="growth-value">+{stats?.last7DaysUsers || 0}</span>
          </div>
          <div className="growth-card">
            <span className="growth-label">Last 30 Days</span>
            <span className="growth-value">+{stats?.last30DaysUsers || 0}</span>
          </div>
          <div className="growth-card">
            <span className="growth-label">Active Now</span>
            <span className="growth-value active-pulse">
              {stats?.activeUsers || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/admin/withdrawals" className="quick-action-card">
            <div className="quick-action-icon">💰</div>
            <div className="quick-action-content">
              <h3>Review Withdrawals</h3>
              <p>{stats?.pendingWithdrawals || 0} pending requests</p>
            </div>
          </Link>

          <Link to="/admin/users" className="quick-action-card">
            <div className="quick-action-icon">👥</div>
            <div className="quick-action-content">
              <h3>Manage Users</h3>
              <p>View all {stats?.totalUsers?.toLocaleString() || 0} users</p>
            </div>
          </Link>

          <Link to="/admin/referrals" className="quick-action-card">
            <div className="quick-action-icon">🔗</div>
            <div className="quick-action-content">
              <h3>View Referrals</h3>
              <p>Track referral activity</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
