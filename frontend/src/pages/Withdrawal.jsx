import React, { useEffect, useState } from "react";
import { fetchMe, requestWithdrawal, fetchWithdrawalHistory } from "../lib/api.js";
import { playClick } from "../lib/clickSound";

const MIN_WITHDRAWAL = 50000;

export default function Withdrawal() {
  const [me, setMe] = useState(null);
  const [history, setHistory] = useState([]);
  const [method, setMethod] = useState("USDT_TRC20");
  const [coins, setCoins] = useState(MIN_WITHDRAWAL);
  const [usdtAddress, setUsdtAddress] = useState("");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetchMe().then(setMe).catch(() => {});
    fetchWithdrawalHistory().then(setHistory).catch(() => {});
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await requestWithdrawal({
        method,
        coins: Number(coins),
        usdtAddress: method === "USDT_TRC20" ? usdtAddress : undefined,
        upiId: method === "UPI" ? upiId : undefined,
      });
      load();
    } catch (e) {
      setError(e?.response?.data?.error || "Withdrawal request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const eligible = me && me.coins >= MIN_WITHDRAWAL;

  return (
    <div className="screen">
      <div className="page-header">
        <p className="page-kicker">Cash Out</p>
        <h1 className="page-title">Withdrawal</h1>
      </div>

      {/* Balance Card */}
      <div className="balance-card">
        <p className="balance-label">Available Balance</p>
        <h2 className="balance-amount">{me?.coins?.toLocaleString() ?? "—"}</h2>
        <p className="balance-min">Minimum: <strong>{MIN_WITHDRAWAL.toLocaleString()}</strong> coins</p>
      </div>

      {!eligible && (
        <p className="error-text" style={{ textAlign: "center", marginBottom: 16 }}>
          ⚠️ You need {MIN_WITHDRAWAL.toLocaleString()} coins to withdraw. Earn more by watching ads!
        </p>
      )}

      {/* Withdrawal Form */}
      <div className="withdrawal-form-card">
        <h3 className="form-section-title">💰 Withdrawal Details</h3>
        <form onSubmit={handleSubmit}>
          <p className="referral-share-label" style={{ marginBottom: 8 }}>Payment Method</p>
          <div className="method-selector">
            <button
              type="button"
              className={`method-btn ${method === "USDT_TRC20" ? "active" : ""}`}
              onClick={() => { playClick(); setMethod("USDT_TRC20"); }}
            >
              🪙 USDT (TRC20)
            </button>
            <button
              type="button"
              className={`method-btn ${method === "UPI" ? "active" : ""}`}
              onClick={() => { playClick(); setMethod("UPI"); }}
            >
              🏦 UPI
            </button>
          </div>

          <p className="referral-share-label" style={{ marginBottom: 8 }}>Amount (Coins)</p>
          <input
            type="number"
            min={MIN_WITHDRAWAL}
            step={1}
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            placeholder="Enter coins to withdraw"
          />

          {method === "USDT_TRC20" ? (
            <>
              <p className="referral-share-label" style={{ marginBottom: 8 }}>USDT Wallet Address</p>
              <input
                value={usdtAddress}
                onChange={(e) => setUsdtAddress(e.target.value)}
                placeholder="TRC20 wallet address"
              />
            </>
          ) : (
            <>
              <p className="referral-share-label" style={{ marginBottom: 8 }}>UPI ID</p>
              <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" />
            </>
          )}

          <button
            className="btn"
            disabled={!eligible || submitting}
            type="submit"
            onClick={(e) => { playClick(); }}
          >
            {submitting ? "Submitting…" : eligible ? "Request Withdrawal" : "Insufficient Balance"}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      {/* History Card */}
      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon" style={{ background: "linear-gradient(135deg, rgba(255, 107, 122, 0.2), rgba(255, 107, 122, 0.1))", border: "1px solid rgba(255, 107, 122, 0.35)" }}>📜</div>
          <div>
            <h3 className="action-card-title">Withdrawal History</h3>
          </div>
        </div>
        {history.length === 0 && (
          <p className="muted" style={{ margin: "12px 0", textAlign: "center" }}>No withdrawal requests yet.</p>
        )}
        {history.map((w) => (
          <div className="activity-item" key={w._id} style={{ marginBottom: 10, background: "transparent", border: "none", boxShadow: "none" }}>
            <div className="activity-icon expense">💰</div>
            <div className="activity-info">
              <p className="activity-type">{w.method === "USDT_TRC20" ? "USDT" : "UPI"} Withdrawal</p>
              <p className="activity-date">{w.coins.toLocaleString()} coins</p>
            </div>
            <span className={`badge ${w.status.toLowerCase()}`}>{w.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
