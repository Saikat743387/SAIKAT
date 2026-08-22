import React, { useEffect, useState } from "react";
import { fetchMe, claimDaily, claimAdReward } from "../lib/api.js";

export default function Home() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);

  async function load() {
    try {
      const data = await fetchMe();
      setMe(data);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load profile");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const alreadyClaimedToday = me?.lastDailyClaimAt && isSameCalendarDay(new Date(me.lastDailyClaimAt), new Date());

  async function handleDailyClaim() {
    setClaiming(true);
    setError("");
    try {
      await claimDaily();
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  // Placeholder ad flow: replace this with your chosen ad network's SDK.
  // The SDK should give you a callback / server-verifiable ref ONLY after
  // the user has watched the entire ad — pass that as adRef below.
  async function handleWatchAd() {
    setWatchingAd(true);
    setError("");
    try {
      // TODO: integrate real ad network SDK here, e.g.:
      // const adRef = await AdNetworkSDK.showRewardedAd();
      const adRef = `demo-${Date.now()}`;
      await claimAdReward(adRef);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || "Ad reward failed");
    } finally {
      setWatchingAd(false);
    }
  }

  if (!me) {
    return <div className="screen"><p className="muted">Loading…</p></div>;
  }

  return (
    <div className="screen">
      <div className="card">
        <p className="muted">👋 Welcome, {me.firstName || me.username || "Player"}</p>
        <div className="coin-balance">🪙 {me.coins.toLocaleString()} Coins</div>
      </div>

      <div className="card">
        <p style={{ marginTop: 0 }}>🎁 Daily Reward</p>
        <p className="muted">Open the app once a day to claim +250 coins.</p>
        <button className="btn" disabled={claiming || alreadyClaimedToday} onClick={handleDailyClaim}>
          {alreadyClaimedToday ? "Already claimed today" : claiming ? "Claiming…" : "CLAIM +250"}
        </button>
      </div>

      <div className="card">
        <p style={{ marginTop: 0 }}>📺 Watch Ad</p>
        <p className="muted">Watch a full ad to earn +100 coins.</p>
        <button className="btn" disabled={watchingAd} onClick={handleWatchAd}>
          {watchingAd ? "Loading ad…" : "WATCH AD +100"}
        </button>
      </div>

      <div className="card">
        <div className="row">
          <span>👥 Referrals</span>
          <strong>{me.totalReferrals}</strong>
        </div>
        <div className="row">
          <span>💼 Total Earned</span>
          <strong>{me.totalEarned.toLocaleString()}</strong>
        </div>
        <div className="row">
          <span>💰 Withdrawn</span>
          <strong>{me.totalWithdrawn.toLocaleString()}</strong>
        </div>
      </div>

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
