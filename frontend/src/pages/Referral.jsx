import React, { useEffect, useState } from "react";
import { fetchReferralInfo, fetchReferralHistory } from "../lib/api.js";

export default function Referral() {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralInfo().then(setInfo).catch(() => {});
    fetchReferralHistory().then(setHistory).catch(() => {});
  }, []);

  function copyLink() {
    if (!info) return;
    navigator.clipboard?.writeText(info.shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="screen">
      <div className="card">
        <p style={{ marginTop: 0 }}>👥 Referral</p>
        <p className="muted">Invite friends — earn +5,000 coins per successful referral.</p>
        {info && (
          <>
            <input readOnly value={info.shareLink} onClick={copyLink} />
            <button className="btn" onClick={copyLink}>{copied ? "Copied!" : "Copy Referral Link"}</button>
          </>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <span>Total Referrals</span>
          <strong>{info?.totalReferrals ?? "—"}</strong>
        </div>
      </div>

      <div className="card">
        <p style={{ marginTop: 0 }}>Referral History</p>
        {history.length === 0 && <p className="muted">No referrals yet.</p>}
        {history.map((r) => (
          <div className="row" key={r._id}>
            <span>{r.referredId?.username || r.referredId?.firstName || r.referredId?.telegramUserId}</span>
            <strong>+{r.rewardCoins.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
