import React, { useEffect, useState } from "react";
import { fetchMe, claimDaily, claimAdReward, fetchAppSettings } from "../lib/api.js";
import { playClick } from "../lib/clickSound";

export default function Home() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  async function load() {
    try {
      const data = await fetchMe();
      setMe(data);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load profile");
    }
  }

  useEffect(() => {
    fetchAppSettings()
      .then((s) => setSettings(s))
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
    load();
  }, []);

  const alreadyClaimedToday = me?.lastDailyClaimAt && isSameCalendarDay(new Date(me.lastDailyClaimAt), new Date());

  async function handleDailyClaim() {
    setClaiming(true);
    setError("");
    setSuccess("");
    try {
      const reward = await claimDaily();
      setMe((current) => current ? { ...current, coins: reward.coins, totalEarned: current.totalEarned + reward.claimed, lastDailyClaimAt: new Date().toISOString() } : current);
      setSuccess(`Daily reward added: +${reward.claimed} coins`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  async function handleWatchAd() {
    setWatchingAd(true);
    setError("");
    setSuccess("");
    try {
      const adRef = `demo-${Date.now()}`;
      const reward = await claimAdReward(adRef);
      setMe((current) => current ? {
        ...current,
        coins: reward.coins,
        totalEarned: current.totalEarned + reward.claimed,
        adClickCount: (current.adClickCount || 0) + 1,
      } : current);
      setSuccess(`Ad counted: +${reward.claimed} coins`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Ad reward failed");
    } finally {
      setWatchingAd(false);
    }
  }

  if (!me) {
    return <div className="screen loading-screen"><div className="spinner"></div><p className="muted">Loading Galaxy App…</p></div>;
  }

  return (
    <div className="screen">
      {/* Hero Section */}
      <div className="hero-section">
        <p className="hero-greeting">👋 Welcome, {me.firstName || me.username || "Player"}</p>
        <div className="hero-coin">
          <div className="hero-coin-icon">🪙</div>
          <div>
            <div className="hero-balance">{me.coins.toLocaleString()}</div>
            <div className="hero-balance-label">Galaxy Coins</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-item-icon">🪙</div>
          <span className="stat-item-value">{me.coins.toLocaleString()}</span>
          <span className="stat-item-label">Coins</span>
        </div>
        <div className="stat-item">
          <div className="stat-item-icon">📺</div>
          <span className="stat-item-value">{me.adClickCount || 0}</span>
          <span className="stat-item-label">Ads</span>
        </div>
        <div className="stat-item">
          <div className="stat-item-icon">👥</div>
          <span className="stat-item-value">{me.totalReferrals || 0}</span>
          <span className="stat-item-label">Refs</span>
        </div>
      </div>

      {/* Daily Reward Card */}
      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon daily">🎁</div>
          <div>
            <h3 className="action-card-title">Daily Reward</h3>
            <p className="action-card-desc">Open the app once a day to claim bonus coins.</p>
          </div>
        </div>
        <div className="action-card-reward">
          <span>+</span>
          <span>{Number(settings?.dailyRewardCoins) || 250} Coins</span>
        </div>
        <button
          className="btn"
          disabled={claiming || alreadyClaimedToday || loadingSettings}
          onClick={() => {
            playClick();
            handleDailyClaim();
          }}
        >
          {alreadyClaimedToday ? "✓ Claimed Today" : claiming ? "Claiming…" : `CLAIM +${Number(settings?.dailyRewardCoins) || 250}`}
        </button>
      </div>

      {/* Watch Ad Card */}
      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon ad">📺</div>
          <div>
            <h3 className="action-card-title">Watch Ad</h3>
            <p className="action-card-desc">Watch a short ad to earn instant coins.</p>
          </div>
        </div>
        <div className="action-card-reward">
          <span>+</span>
          <span>{Number(settings?.adRewardCoins) || 100} Coins</span>
        </div>
        <button
          className="btn"
          disabled={watchingAd || loadingSettings}
          onClick={() => {
            playClick();
            handleWatchAd();
          }}
        >
          {watchingAd ? "Loading Ad…" : `WATCH AD +${Number(settings?.adRewardCoins) || 100}`}
        </button>
      </div>

      {/* Quick Stats Card */}
      <div className="action-card">
        <div className="action-card-header">
          <div className="action-card-icon" style={{ background: "linear-gradient(135deg, rgba(139, 108, 255, 0.2), rgba(139, 108, 255, 0.1))", border: "1px solid rgba(139, 108, 255, 0.3)" }}>📊</div>
          <div>
            <h3 className="action-card-title">Your Stats</h3>
          </div>
        </div>
        <div className="row" style={{ borderBottom: "none" }}>
          <span className="muted">💼 Total Earned</span>
          <strong>{me.totalEarned.toLocaleString()}</strong>
        </div>
        <div className="row" style={{ borderBottom: "none" }}>
          <span className="muted">💰 Withdrawn</span>
          <strong>{me.totalWithdrawn.toLocaleString()}</strong>
        </div>
      </div>

      {success && <p className="success-text">{success}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function isSameCalendarDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
