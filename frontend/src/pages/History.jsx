import React, { useEffect, useState } from "react";
import { fetchCoinHistory } from "../lib/api.js";

export default function History() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    fetchCoinHistory().then(setTxs).catch(() => {});
  }, []);

  return (
    <div className="screen">
      <div className="card">
        <p style={{ marginTop: 0 }}>📜 Coin History</p>
        {txs.length === 0 && <p className="muted">No activity yet.</p>}
        {txs.map((tx) => (
          <div className="row" key={tx._id}>
            <span>{labelFor(tx.type)}</span>
            <strong style={{ color: tx.amount >= 0 ? "#4ee08a" : "#ff7676" }}>
              {tx.amount >= 0 ? "+" : ""}
              {tx.amount.toLocaleString()}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function labelFor(type) {
  const map = {
    DAILY_CLAIM: "🎁 Daily Claim",
    AD_REWARD: "📺 Ad Reward",
    REFERRAL: "👥 Referral Bonus",
    TASK_REWARD: "🎯 Task Reward",
    WITHDRAWAL: "💰 Withdrawal Request",
    WITHDRAWAL_REFUND: "↩️ Withdrawal Refund",
    ADMIN_ADJUST: "🛠️ Admin Adjustment",
  };
  return map[type] || type;
}
