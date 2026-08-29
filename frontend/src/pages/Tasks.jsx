import React, { useEffect, useState } from "react";
import { fetchMe, claimAdReward } from "../lib/api.js";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchMe()
      .then(user => {
        setMe(user);
        if (user?.adClickCount !== undefined) {
            setAdsWatchedCount(user.adClickCount);
        }
      })
      .catch(() => {});

    const initial = Array.from({ length: TASK_COUNT }, (_, i) => ({
      id: i,
      name: TASK_NAMES[i],
      status: "available",
    }));
    setTasks(initial);
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
    if (adsWatchedCount >= 10) return;
    setError("");
    setSuccess("");
    try {
      const adRef = `extra-ad-${Date.now()}`;
      const reward = await claimAdReward(adRef);
      setSuccess(`+${reward.claimed} coins earned!`);
      setAdsWatchedCount(prev => prev + 1);
      setMe((current) => current ? { ...current, coins: reward.coins } : current);
    } catch (e) {
      setError(e?.response?.data?.error || "Ad reward failed");
    }
  }

  return (
    <div className="screen">
      <div className="card">
        <p style={{ marginTop: 0 }}>🎯 Tasks</p>
        <p className="muted">
          Complete tasks to earn bonus coins. Watch ads to earn +100 coins
          per task.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <strong style={{ fontSize: 16 }}>Watch Ads ({adsWatchedCount}/10)</strong>
          <span className="badge" style={{
            background: adsWatchedCount >= 10 ? "#dcfce7" : "#eff6ff",
            color: adsWatchedCount >= 10 ? "#166534" : "#2563eb"
          }}>
            {adsWatchedCount >= 10 ? "Completed" : "Available"}
          </span>
        </div>
        <button
          className="btn"
          disabled={adsWatchedCount >= 10}
          onClick={() => {
            playClick();
            handleWatchExtraAd();
          }}
          style={{ marginTop: 10 }}
        >
          {adsWatchedCount >= 10 ? "Completed" : "Watch Ad"}
        </button>
      </div>

      {tasks.map((task) => (
        <div className="card" key={task.id}>
          <div className="row" style={{ paddingBottom: 10, marginBottom: 10, borderBottomColor: "var(--border-color)" }}>
            <div>
              <strong style={{ fontSize: 15 }}>{task.name}</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                Watch a short ad to earn coins
              </p>
            </div>
            <span
              className="badge"
              style={{
                background:
                  task.status === "done"
                    ? "#dcfce7"
                    : task.status === "watching"
                    ? "#fef3c7"
                    : "#eff6ff",
                color:
                  task.status === "done"
                    ? "#166534"
                    : task.status === "watching"
                    ? "#92400e"
                    : "#2563eb",
                fontWeight: 700,
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 20,
              }}
            >
              {task.status === "done"
                ? "✅ Done"
                : task.status === "watching"
                ? "⏳ Watching…"
                : "💎 +100"}
            </span>
          </div>
          <button
            className="btn"
            disabled={task.status !== "available"}
            style={
              task.status === "done"
                ? { background: "#16a34a", cursor: "default" }
                : task.status === "watching"
                ? { background: "#d97706", cursor: "not-allowed" }
                : {}
            }
            onClick={() => {
              playClick();
              handleWatchAd(task.id);
            }}
          >
            {task.status === "done"
              ? "Completed"
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
