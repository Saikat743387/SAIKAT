import React, { useEffect, useState } from "react";
import { fetchReferralInfo, fetchReferralHistory, fetchAppSettings } from "../lib/api.js";
import { playClick } from "../lib/clickSound";

const REFERRAL_MESSAGE = encodeURIComponent(
  "Join me on Galaxy STAR and start earning coins! Use my referral link:"
);

export default function Referral() {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchReferralInfo().then(setInfo).catch(() => {});
    fetchReferralHistory().then(setHistory).catch(() => {});
    fetchAppSettings().then((s) => setSettings(s)).catch(() => {});
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
      <div className="page-header">
        <p className="page-kicker">Invite & Earn</p>
        <h1 className="page-title">Referrals</h1>
      </div>

      {/* Referral Hero */}
      <div className="referral-hero">
        <div className="referral-hero-icon">👥</div>
        <h2 className="referral-hero-title">Invite Friends</h2>
        <div className="referral-hero-reward">
          <span>💰</span>
          <span>Earn +{(Number(settings?.referralRewardCoins) || 5000).toLocaleString()} Coins Per Referral</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>Share your link and earn when friends join!</p>
      </div>

      {/* Referral Link Card */}
      {info && (
        <div className="referral-link-card">
          <div className="form-section-title">🔗 Your Referral Link</div>
          <input
            className="referral-link-input"
            readOnly
            value={info.shareLink}
            onClick={() => {
              playClick();
              copyLink();
            }}
          />
          <button
            className="share-btn copy"
            onClick={() => {
              playClick();
              copyLink();
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy Referral Link"}
          </button>
          <p className="referral-share-label">Or share directly:</p>
          <div className="share-buttons">
            <button
              className="share-btn whatsapp"
              onClick={() => {
                playClick();
                openShare("whatsapp");
              }}
            >
              📱 WhatsApp
            </button>
            <button
              className="share-btn telegram"
              onClick={() => {
                playClick();
                openShare("telegram");
              }}
            >
              ✈️ Telegram
            </button>
          </div>
        </div>
      )}

      {/* Stats Card */}
      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon" style={{ background: "linear-gradient(135deg, rgba(91, 154, 255, 0.25), rgba(91, 154, 255, 0.1))", border: "1px solid rgba(91, 154, 255, 0.35)" }}>📊</div>
          <div>
            <h3 className="action-card-title">Referral Stats</h3>
          </div>
        </div>
        <div className="row" style={{ borderBottom: "none" }}>
          <span className="muted">Total Referrals</span>
          <strong style={{ color: "#5b9aff" }}>{info?.totalReferrals ?? "—"}</strong>
        </div>
        <div className="row" style={{ borderBottom: "none" }}>
          <span className="muted">Earned from Referrals</span>
          <strong style={{ color: "#ffd700" }}>{info ? (info.totalReferrals * (Number(settings?.referralRewardCoins) || 5000)).toLocaleString() : "—"}</strong>
        </div>
      </div>

      {/* History Card */}
      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon" style={{ background: "linear-gradient(135deg, rgba(62, 232, 154, 0.25), rgba(62, 232, 154, 0.1))", border: "1px solid rgba(62, 232, 154, 0.35)" }}>📜</div>
          <div>
            <h3 className="action-card-title">Referral History</h3>
          </div>
        </div>
        {history.length === 0 && (
          <p className="muted" style={{ margin: "12px 0", textAlign: "center" }}>No referrals yet. Start sharing your link!</p>
        )}
        {history.map((r) => (
          <div className="activity-item" key={r._id} style={{ marginBottom: 10, background: "transparent", border: "none", boxShadow: "none" }}>
            <div className="activity-icon income">👥</div>
            <div className="activity-info">
              <p className="activity-type">{r.referredId?.username || r.referredId?.firstName || r.referredId?.telegramUserId}</p>
            </div>
            <span className="activity-amount positive">+{r.rewardCoins.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
