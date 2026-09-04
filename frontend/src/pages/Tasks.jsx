import React, { useEffect, useState } from "react";
import { fetchMe, claimAdReward, fetchAppSettings } from "../lib/api.js";
import { playClick } from "../lib/clickSound";

const TASK_COUNT = 10;
const TASK_NAMES = [
  "Watch Ad 1",
  "Watch Ad 2",
  "Watch Ad 3",
  "Watch Ad 4",
  "Watch Ad 5",
  "Watch Ad 6",
  "Watch Ad 7",
  "Watch Ad 8",
  "Watch Ad 9",
  "Watch Ad 10",
];

export default function Tasks() {
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [adsWatchedCount, setAdsWatchedCount] = useState(0);
  const [adRewardCoins, setAdRewardCoins] = useState(100);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAppSettings()
      .then((settings) => {
        if (settings?.adRewardCoins) {
          setAdRewardCoins(Number(settings.adRewardCoins));
        }
      })
      .catch(() => {});

    fetchMe()
      .then((user) => {
        setMe(user);
        const count = user?.adClickCount || 0;
        setAdsWatchedCount(count);

        const initial = Array.from({ length: TASK_COUNT }, (_, i) => ({
          id: i,
          name: TASK_NAMES[i],
          status: i < count ? "done" : "available",
        }));
        setTasks(initial);
      })
      .catch(() => {
        const initial = Array.from({ length: TASK_COUNT }, (_, i) => ({
          id: i,
          name: TASK_NAMES[i],
          status: "available",
        }));
        setTasks(initial);
      });
  }, []);

  async function handleWatchAd(index) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, status: "watching" } : t))
    );
    setError("");
    setSuccess("");

    try {
      const adRef = `task-${index + 1}-${Date.now()}`;
      const reward = await claimAdReward(adRef);
      setSuccess(`+${reward.claimed} coins earned!`);
      setAdsWatchedCount((prev) => Math.min(prev + 1, TASK_COUNT));
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, status: "done" } : t))
      );
      setMe((current) =>
        current ? { ...current, coins: reward.coins } : current
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Ad reward failed");
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, status: "available" } : t))
      );
    }
  }

  async function handleWatchExtraAd() {
    if (adsWatchedCount >= TASK_COUNT) return;
    setError("");
    setSuccess("");
    try {
      const nextIndex = adsWatchedCount;
      const adRef = `extra-ad-${Date.now()}`;
      const reward = await claimAdReward(adRef);
      setSuccess(`+${reward.claimed} coins earned!`);
      setAdsWatchedCount((prev) => Math.min(prev + 1, TASK_COUNT));
      setTasks((prev) =>
        prev.map((t, i) => (i === nextIndex ? { ...t, status: "done" } : t))
      );
      setMe((current) => (current ? { ...current, coins: reward.coins } : current));
    } catch (e) {
      setError(e?.response?.data?.error || "Ad reward failed");
    }
  }

  return (
    <div className="screen">
      <div className="page-header">
        <p className="page-kicker">Earn Coins</p>
        <h1 className="page-title">Tasks</h1>
      </div>

      {/* Ad Progress Card */}
      <div className="action-card" style={{ marginBottom: 18 }}>
        <div className="action-card-header">
          <div className="action-card-icon" style={{ background: "linear-gradient(135deg, rgba(255, 200, 87, 0.25), rgba(255, 200, 87, 0.1))", border: "1px solid rgba(255, 200, 87, 0.35)" }}>🎯</div>
          <div>
            <h3 className="action-card-title">Watch Ads Progress</h3>
            <p className="action-card-desc">Complete up to 10 ad tasks daily</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ flex: 1, height: 8, background: "rgba(255, 255, 255, 0.08)", borderRadius: 4, overflow: "hidden", marginRight: 12 }}>
            <div style={{ width: `${Math.min((adsWatchedCount / TASK_COUNT) * 100, 100)}%`, height: "100%", background: "linear-gradient(90deg, #8b6cff, #ffc857)", borderRadius: 4, transition: "width 0.3s ease" }}></div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffd700", whiteSpace: "nowrap" }}>{adsWatchedCount}/{TASK_COUNT}</span>
        </div>
        <button
          className="btn"
          disabled={adsWatchedCount >= TASK_COUNT}
          onClick={() => {
            playClick();
            handleWatchExtraAd();
          }}
        >
          {adsWatchedCount >= TASK_COUNT ? "✓ Daily Complete" : "Watch Ad"}
        </button>
      </div>

      {/* Task Cards */}
      {tasks.map((task) => (
        <div className={`task-card ${task.status === "done" ? "completed" : task.status === "watching" ? "watching" : ""}`} key={task.id}>
          <div className="task-card-header">
            <div className="task-icon">📺</div>
            <div className="task-info">
              <h3 className="task-name">{task.name}</h3>
              <p className="task-desc">Watch a short ad to earn coins</p>
            </div>
            <span className="task-reward-badge">
              {task.status === "done" ? "✓ Done" : task.status === "watching" ? "⏳ …" : `+${adRewardCoins}`}
            </span>
          </div>
          <span className={`task-status ${task.status}`}>
            {task.status === "done" ? "Completed" : task.status === "watching" ? "Watching Ad…" : "Available"}
          </span>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            disabled={task.status !== "available"}
            onClick={() => {
              playClick();
              handleWatchAd(task.id);
            }}
          >
            {task.status === "done"
              ? "Completed ✓"
              : task.status === "watching"
              ? "Loading ad…"
              : "Watch Ad"}
          </button>
        </div>
      ))}

      {success && <p className="success-text">{success}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
