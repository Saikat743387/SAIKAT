import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const limit = 50;

  useEffect(() => {
    checkAuth();
    loadUsers();
  }, [page]);

  function checkAuth() {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin");
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const { data } = await axios.get(
        `${API_BASE_URL}/admin/users?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      } else {
        setError("Failed to load users");
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>👥 User Management</h1>
          <p className="muted">Total: {total.toLocaleString()} users</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="admin-nav-link">
          📊 Dashboard
        </Link>
        <Link to="/admin/users" className="admin-nav-link active">
          👥 Users
        </Link>
        <Link to="/admin/withdrawals" className="admin-nav-link">
          💰 Withdrawals
        </Link>
        <Link to="/admin/referrals" className="admin-nav-link">
          🔗 Referrals
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading users...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Telegram ID</th>
                  <th>Coins</th>
                  <th>Referrals</th>
                  <th>Total Earned</th>
                  <th>Withdrawn</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <strong>
                          {user.firstName || user.username || "Unknown"}
                        </strong>
                        {user.username && (
                          <span className="user-username">@{user.username}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code>{user.telegramUserId}</code>
                    </td>
                    <td>
                      <span className="coin-badge">
                        🪙 {user.coins.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="referral-badge">
                        👥 {user.totalReferrals}
                      </span>
                    </td>
                    <td>{user.totalEarned.toLocaleString()}</td>
                    <td>{user.totalWithdrawn.toLocaleString()}</td>
                    <td className="date-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="pagination-btn"
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="pagination-btn"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
