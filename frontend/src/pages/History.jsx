import React, { useEffect, useState } from "react";
import { fetchCoinHistory } from "../lib/api.js";

export default function History() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    fetchCoinHistory().then(setTxs).catch(() => {});
  }, []);

  const iconFor = (type) => {
    switch (type) {
      case "DAILY_CLAIM": return "🎁";
      case "AD_REWARD": return "📺";
      case "REFERRAL": return "👥";
      case "TASK_REWARD": return "🎯";
      case "WITHDRAWAL": return "💰";
      case "WITHDRAWAL_REFUND": return "↩️";
      case "ADMIN_ADJUST": return "🛠️";
      default: return "🪙";
    }
  };

  const typeLabel = (type) => {
    const map = {
      DAILY_CLAIM: "Daily Claim",
      AD_REWARD: "Ad Reward",
      REFERRAL: "Referral Bonus",
      TASK_REWARD: "Task Reward",
      WITHDRAWAL: "Withdrawal Request",
      WITHDRAWAL_REFUND: "Withdrawal Refund",
      ADMIN_ADJUST: "Admin Adjustment",
    };
    return map[type] || type;
  };

  return (
    <div className="screen">
      <div className="page-header">
        <p className="page-kicker">Activity</p>
        <h1 className="page-title">History</h1>
      </div>

      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon" style={{ background: "linear-gradient(135deg, rgba(139, 108, 255, 0.25), rgba(139, 108, 255, 0.1))", border: "1px solid rgba(139, 108, 255, 0.35)" }}>📜</div>
          <div>
            <h3 className="action-card-title">Coin Activity</h3>
            <p className="action-card-desc">Track all your earnings and withdrawals</p>
          </div>
        </div>

        {txs.length === 0 && (
          <p className="muted" style={{ margin: "16px 0", textAlign: "center" }}>No activity yet. Start earning coins!</p>
        )}

        <div className="activity-list">
          {txs.map((tx) => (
            <div className="activity-item" key={tx._id}>
              <div className={`activity-icon ${tx.amount >= 0 ? "income" : "expense"}`}>
                {iconFor(tx.type)}
              </div>
              <div className="activity-info">
                <p className="activity-type">{typeLabel(tx.type)}</p>
                <p className="activity-date">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`activity-amount ${tx.amount >= 0 ? "positive" : "negative"}`}>
                {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
