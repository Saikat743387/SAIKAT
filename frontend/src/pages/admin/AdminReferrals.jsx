import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadReferrals();
  }, []);

  function checkAuth() {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin");
    }
  }

  async function loadReferrals() {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const { data } = await axios.get(`${API_BASE_URL}/admin/referrals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReferrals(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      } else {
        setError("Failed to load referrals");
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

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>🔗 Referral Overview</h1>
          <p className="muted">{referrals.length} referral(s) recorded</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="admin-nav-link">
          📊 Dashboard
        </Link>
        <Link to="/admin/users" className="admin-nav-link">
          👥 Users
        </Link>
        <Link to="/admin/withdrawals" className="admin-nav-link">
          💰 Withdrawals
        </Link>
        <Link to="/admin/referrals" className="admin-nav-link active">
          🔗 Referrals
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading referrals...</div>
      ) : referrals.length === 0 ? (
        <div className="empty-state">
          <p>No referrals found</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Referrer</th>
                <th>Referred User</th>
                <th>Reward</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((ref) => (
                <tr key={ref._id}>
                  <td>
                    <div className="user-info">
                      <strong>
                        {ref.referrerId?.firstName ||
                          ref.referrerId?.username ||
                          "Unknown"}
                      </strong>
                      {ref.referrerId?.username && (
                        <span className="user-username">
                          @{ref.referrerId.username}
                        </span>
                      )}
                      <code className="telegram-id-small">
                        {ref.referrerId?.telegramUserId}
                      </code>
                    </div>
                  </td>
                  <td>
                    <div className="user-info">
                      <strong>
                        {ref.referredId?.firstName ||
                          ref.referredId?.username ||
                          "Unknown"}
                      </strong>
                      {ref.referredId?.username && (
                        <span className="user-username">
                          @{ref.referredId.username}
                        </span>
                      )}
                      <code className="telegram-id-small">
                        {ref.referredId?.telegramUserId}
                      </code>
                    </div>
                  </td>
                  <td>
                    <span className="coin-badge">
                      🪙 {ref.rewardCoins.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    {ref.credited ? (
                      <span className="status-badge status-successful">
                        ✅ Credited
                      </span>
                    ) : (
                      <span className="status-badge status-pending">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td className="date-cell">
                    {new Date(ref.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
