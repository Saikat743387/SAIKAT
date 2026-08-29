import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { playClick } from "../../lib/clickSound";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  // ---------------------------------------------------------------------
  // Auth check & data loading
  // ---------------------------------------------------------------------
  useEffect(() => {
    checkAuth();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchTerm]);

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
        `${API_BASE_URL}/admin/users/search?q=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
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

  // ---------------------------------------------------------------------
  // User detail loading
  // ---------------------------------------------------------------------
  async function loadUserDetails(userId) {
    try {
      setUserLoading(true);
      const token = localStorage.getItem("admin_token");
      const { data } = await axios.get(
        `${API_BASE_URL}/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedUser(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      } else {
        setError("Failed to load user details");
      }
    } finally {
      setUserLoading(false);
    }
  }

  function closeUserDetails() {
    setSelectedUser(null);
  }

  // ---------------------------------------------------------------------
  // Block / Unblock handling
  // ---------------------------------------------------------------------
  async function toggleBlockUser(userId, action, reason = "") {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(
        `${API_BASE_URL}/admin/users/${userId}/block`,
        { action, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh the list and, if needed, the detail view
      await loadUsers();
      if (selectedUser && selectedUser.user && selectedUser.user._id === userId) {
        await loadUserDetails(userId);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      } else {
        setError(`Failed to ${action} user: ${err?.response?.data?.error || "Unknown error"}`);
      }
    }
  }

  // ---------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------
  const totalPages = Math.ceil(total / limit);

  function isSameDay(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth() &&
      d.getUTCDate() === now.getUTCDate()
    );
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>👥 User Management</h1>
          <p className="muted">Total: {total.toLocaleString()} users</p>
        </div>
        <button onClick={() => { localStorage.removeItem("admin_token"); localStorage.removeItem("admin_username"); navigate("/admin"); }} className="btn-logout">
          Logout
        </button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="admin-nav-link">📊 Dashboard</Link>
        <Link to="/admin/users" className="admin-nav-link active">👥 Users</Link>
        <Link to="/admin/withdrawals" className="admin-nav-link">💰 Withdrawals</Link>
        <Link to="/admin/referrals" className="admin-nav-link">🔗 Referrals</Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-search" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by Telegram ID, username, or referral code..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
        />
        <button className="btn-search" onClick={() => { setPage(1); loadUsers(); }}>
          🔍 Search
        </button>
        <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="empty-state"><p>No users found.</p></div>
      ) : (
        <>
          <div className="users-table" style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Balance</th>
                  <th>Total Earned</th>
                  <th>Total Withdrawn</th>
                  <th>Referrals</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td><code>{user.telegramUserId}</code></td>
                    <td>{user.username ? `@${user.username}` : "(no username)"}</td>
                    <td>{user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}` : <span className="muted">(no name)</span>}</td>
                    <td className="coin-amount">{user.coins.toLocaleString()}</td>
                    <td className="coin-amount">{user.totalEarned.toLocaleString()}</td>
                    <td className="coin-amount">{user.totalWithdrawn.toLocaleString()}</td>
                    <td>{user.totalReferrals.toLocaleString()}</td>
                    <td>{user.isBlocked ? <span className="status-badge status-blocked">🚫 Blocked</span> : <span className="status-badge status-active">✅ Active</span>}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="admin-actions" style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn-view" onClick={() => { playClick(); loadUserDetails(user._id); }}>
                          👁️ View
                        </button>
                        <button
                          className={user.isBlocked ? "btn-unblock" : "btn-block"}
                          onClick={() => {
                            playClick();
                            const action = user.isBlocked ? "unblock" : "block";
                            const reason = action === "block" ? prompt("Reason for blocking this user:") : "";
                            if (action === "block" && (!reason || !reason.trim())) {
                              alert("Block reason is required.");
                              return;
                            }
                            toggleBlockUser(user._id, action, reason);
                          }}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination" style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button disabled={page <= 1} onClick={() => { playClick(); setPage(page - 1); }}>◀ Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => { playClick(); setPage(page + 1); }}>Next ▶</button>
          </div>
        </>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={closeUserDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="btn-close" onClick={closeUserDetails}>✕</button>
            </div>
            <div className="modal-body">
              {userLoading ? (
                <div className="admin-loading">Loading details…</div>
              ) : (
                <>
                  <section className="detail-section">
                    <h3>Basic Info</h3>
                    <p><strong>Telegram ID:</strong> {selectedUser.user.telegramUserId}</p>
                    <p><strong>Username:</strong> {selectedUser.user.username || "(none)"}</p>
                    <p><strong>Name:</strong> {selectedUser.user.firstName || ""} {selectedUser.user.lastName || ""}</p>
                    <p><strong>Language:</strong> {selectedUser.user.languageCode || "(not set)"}</p>
                    <p><strong>Referral Code:</strong> {selectedUser.user.referralCode}</p>
                    <p><strong>Referred By:</strong> {selectedUser.user.referredBy || "(none)"}</p>
                  </section>
                  <section className="detail-section">
                    <h3>Balance & Earnings</h3>
                    <p><strong>Current Balance:</strong> {selectedUser.user.coins.toLocaleString()} coins</p>
                    <p><strong>Total Earned:</strong> {selectedUser.user.totalEarned.toLocaleString()} coins</p>
                    <p><strong>Total Withdrawn:</strong> {selectedUser.user.totalWithdrawn.toLocaleString()} coins</p>
                    <p><strong>Referral Count:</strong> {selectedUser.user.totalReferrals}</p>
                    <p><strong>Daily Claim Eligible:</strong> {isSameDay(selectedUser.user.lastDailyClaimAt) ? "No" : "Yes"}</p>
                  </section>
                  <section className="detail-section">
                    <h3>Account Status</h3>
                    <p><strong>Status:</strong> {selectedUser.user.isBlocked ? "🚫 Blocked" : "✅ Active"}</p>
                    {selectedUser.user.isBlocked && (
                      <>
                        <p><strong>Blocked At:</strong> {new Date(selectedUser.user.blockedAt).toLocaleString()}</p>
                        <p><strong>Block Reason:</strong> {selectedUser.user.blockReason}</p>
                      </>
                    )}
                    <p><strong>Created At:</strong> {new Date(selectedUser.user.createdAt).toLocaleString()}</p>
                    <p><strong>Last Active:</strong> {new Date(selectedUser.user.lastActiveAt).toLocaleString()}</p>
                  </section>
                  {selectedUser.recentTransactions && selectedUser.recentTransactions.length > 0 && (
                    <section className="detail-section">
                      <h3>Recent Transactions</h3>
                      <table className="admin-table">
                        <thead>
                          <tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Note</th></tr>
                        </thead>
                        <tbody>
                          {selectedUser.recentTransactions.map((tx) => (
                            <tr key={tx._id}>
                              <td>{new Date(tx.createdAt).toLocaleString()}</td>
                              <td>{tx.type}</td>
                              <td className={tx.amount >= 0 ? "positive" : "negative"}>
                                {tx.amount >= 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                              </td>
                              <td>{tx.balanceAfter.toLocaleString()}</td>
                              <td>{tx.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className={selectedUser.user.isBlocked ? "btn-unblock" : "btn-block"}
                onClick={() => {
                  const action = selectedUser.user.isBlocked ? "unblock" : "block";
                  const reason = action === "block" ? prompt("Reason for blocking:") : "";
                  if (action === "block" && (!reason || !reason.trim())) {
                    alert("Block reason required.");
                    return;
                  }
                  toggleBlockUser(selectedUser.user._id, action, reason);
                }}
              >
                {selectedUser.user.isBlocked ? "Unblock User" : "Block User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
