import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  fetchAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  clearAdminToken,
} from "../../lib/adminApi.js";
import { playClick } from "../../lib/clickSound";

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      navigate("/admin");
      return;
    }
    loadWithdrawals();
  }, [filter, navigate]);

  async function loadWithdrawals() {
    try {
      setLoading(true);
      const params = filter ? { status: filter } : {};
      const data = await fetchAdminWithdrawals(params);
      // The enhanced endpoint returns { withdrawals, total, page, limit }
      setWithdrawals(data.withdrawals || data);
    } catch (err) {
      if (err?.response?.status === 401) {
        clearAdminToken();
        navigate("/admin");
      } else {
        setError("Failed to load withdrawals");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(withdrawalId) {
    const note = prompt("Add admin note (optional):");
    if (note === null) return;

    setProcessingId(withdrawalId);
    try {
      await approveWithdrawal(withdrawalId, note);
      alert("✅ Withdrawal approved successfully!");
      loadWithdrawals();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to approve withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(withdrawalId) {
    const note = prompt("Rejection reason (required):");
    if (!note || note.trim() === "") {
      alert("Please provide a rejection reason");
      return;
    }

    setProcessingId(withdrawalId);
    try {
      await rejectWithdrawal(withdrawalId, note);
      alert("❌ Withdrawal rejected and coins refunded to user");
      loadWithdrawals();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to reject withdrawal");
    } finally {
      setProcessingId(null);
    }
  }

  function handleLogout() {
    clearAdminToken();
    navigate("/admin");
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>💰 Withdrawal Management</h1>
          <p className="muted">{withdrawals.length} withdrawal(s) found</p>
        </div>
        <button onClick={(e) => {
          playClick();
          handleLogout();
        }} className="btn-logout">
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
        <Link to="/admin/withdrawals" className="admin-nav-link active">
          💰 Withdrawals
        </Link>
        <Link to="/admin/referrals" className="admin-nav-link">
          🔗 Referrals
        </Link>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === "PENDING" ? "active" : ""}`}
          onClick={(e) => {
            playClick();
            setFilter("PENDING");
          }}
        >
          ⏳ Pending
        </button>
        <button
          className={`filter-tab ${filter === "SUCCESSFUL" ? "active" : ""}`}
          onClick={(e) => {
            playClick();
            setFilter("SUCCESSFUL");
          }}
        >
          ✅ Approved
        </button>
        <button
          className={`filter-tab ${filter === "REJECTED" ? "active" : ""}`}
          onClick={(e) => {
            playClick();
            setFilter("REJECTED");
          }}
        >
          ❌ Rejected
        </button>
        <button
          className={`filter-tab ${filter === "" ? "active" : ""}`}
          onClick={() => setFilter("")}
        >
          📋 All
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="admin-loading">Loading withdrawals...</div>
      ) : withdrawals.length === 0 ? (
        <div className="empty-state">
          <p>No {filter.toLowerCase()} withdrawals found</p>
        </div>
      ) : (
        <div className="withdrawals-grid">
          {withdrawals.map((w) => (
            <div key={w._id} className={`withdrawal-card status-${w.status.toLowerCase()}`}>
              <div className="withdrawal-header">
                <div className="withdrawal-user">
                  <strong>
                    {w.userId?.firstName || w.userId?.username || "Unknown User"}
                  </strong>
                  {w.userId?.username && (
                    <span className="user-username">@{w.userId.username}</span>
                  )}
                  <code className="telegram-id">{w.userId?.telegramUserId}</code>
                </div>
                <span className={`status-badge status-${w.status.toLowerCase()}`}>
                  {w.status}
                </span>
              </div>

              <div className="withdrawal-details">
                <div className="detail-row">
                  <span className="detail-label">💰 Amount:</span>
                  <span className="detail-value coin-amount">
                    {w.coins.toLocaleString()} coins
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">📋 Method:</span>
                  <span className="detail-value">{w.method}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">
                    {w.method === "USDT_TRC20" ? "🔑 USDT Address:" : "💳 UPI ID:"}
                  </span>
                  <div className="detail-value-copy">
                    <code className="payment-detail">
                      {w.usdtAddress || w.upiId}
                    </code>
                    <button
                      className="btn-copy"
                      onClick={() => copyToClipboard(w.usdtAddress || w.upiId)}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div className="detail-row">
                  <span className="detail-label">📅 Requested:</span>
                  <span className="detail-value">
                    {new Date(w.requestedAt).toLocaleString()}
                  </span>
                </div>

                {w.processedAt && (
                  <div className="detail-row">
                    <span className="detail-label">✅ Processed:</span>
                    <span className="detail-value">
                      {new Date(w.processedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {w.adminNote && (
                  <div className="detail-row admin-note">
                    <span className="detail-label">📝 Admin Note:</span>
                    <span className="detail-value">{w.adminNote}</span>
                  </div>
                )}
              </div>

              {w.status === "PENDING" && (
                <div className="withdrawal-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(w._id)}
                    disabled={processingId === w._id}
                  >
                    {processingId === w._id ? "Processing..." : "✅ Approve"}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(w._id)}
                    disabled={processingId === w._id}
                  >
                    {processingId === w._id ? "Processing..." : "❌ Reject"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
