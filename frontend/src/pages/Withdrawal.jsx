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
      <div className="card">
        <p style={{ marginTop: 0 }}>💰 Withdrawal</p>
        <p className="muted">
          Minimum withdrawal: {MIN_WITHDRAWAL.toLocaleString()} coins. Your balance:{" "}
          <strong>{me?.coins?.toLocaleString() ?? "—"}</strong>
        </p>

        {!eligible && (
          <p className="error-text">Minimum withdrawal is {MIN_WITHDRAWAL.toLocaleString()} coins</p>
        )}

        <form onSubmit={handleSubmit}>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="USDT_TRC20">USDT (TRC20)</option>
            <option value="UPI">UPI</option>
          </select>

          <input
            type="number"
            min={MIN_WITHDRAWAL}
            step={1}
            value={coins}
            onChange={(e) => setCoins(e.target.value)}
            placeholder="Coins to withdraw"
          />

          {method === "USDT_TRC20" ? (
            <input
              value={usdtAddress}
              onChange={(e) => setUsdtAddress(e.target.value)}
              placeholder="USDT TRC20 wallet address"
            />
          ) : (
            <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="UPI ID (e.g. name@bank)" />
          )}

          <button className="btn" disabled={!eligible || submitting} type="submit" onClick={(e) => {
          playClick();
        }}>
            {submitting ? "Submitting…" : "Request Withdrawal"}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        <p style={{ marginTop: 0 }}>Withdrawal History</p>
        {history.length === 0 && <p className="muted">No withdrawal requests yet.</p>}
        {history.map((w) => (
          <div className="row" key={w._id}>
            <span>
              {w.coins.toLocaleString()} coins · {w.method === "USDT_TRC20" ? "USDT" : "UPI"}
            </span>
            <span className={`badge ${w.status.toLowerCase()}`}>{w.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
