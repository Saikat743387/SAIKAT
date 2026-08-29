import React, { useEffect, useState } from "react";
import { fetchReferralInfo, fetchReferralHistory } from "../lib/api.js";
import { playClick } from "../lib/clickSound";

const REFERRAL_MESSAGE = encodeURIComponent(
  "Join me on Galaxy STAR and start earning coins! Use my referral link:"
);

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

  function openShare(platform) {
    if (!info) return;
    const encodedLink = encodeURIComponent(info.shareLink);

    if (platform === "whatsapp") {
      window.open(
        `https://wa.me/?text=${REFERRAL_MESSAGE}%20${encodedLink}`,
        "_blank"
      );
    } else if (platform === "telegram") {
      window.open(
        `https://t.me/share/url?url=${encodedLink}&text=${REFERRAL_MESSAGE}`,
        "_blank"
      );
    }
  }

  return (
    <div className="screen">
      <div className="card">
        <p style={{ marginTop: 0 }}>👥 Referral</p>
        <p className="muted">Invite friends — earn +5,000 coins per successful referral.</p>
        {info && (
          <>
            <input readOnly value={info.shareLink} onClick={() => {
              playClick();
              copyLink();
            }} />
            <button className="btn" onClick={() => {
              playClick();
              copyLink();
            }}>{copied ? "Copied!" : "Copy Referral Link"}</button>
            <div className="share-options" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted-color)" }}>Share link:</p>
                <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn"
                      onClick={() => {
                        playClick();
                        openShare("whatsapp");
                      }}
                    >
                      📱 WhatsApp
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        playClick();
                        openShare("telegram");
                      }}
                    >
                      ✈️ Telegram
                    </button>
                </div>
            </div>
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
