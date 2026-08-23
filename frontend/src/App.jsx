import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { initTelegramApp, getRawInitData, waitForTelegramWebApp } from "./lib/telegram.js";
import { verifyTelegramLogin, getToken } from "./lib/api.js";

import Home from "./pages/Home.jsx";
import Tasks from "./pages/Tasks.jsx";
import Referral from "./pages/Referral.jsx";
import Withdrawal from "./pages/Withdrawal.jsx";
import History from "./pages/History.jsx";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals.jsx";
import AdminReferrals from "./pages/admin/AdminReferrals.jsx";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute.jsx";

export default function App() {
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const location = useLocation();

  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    // Skip Telegram auth for admin routes
    if (isAdminRoute) {
      setStatus("ready");
      return;
    }

    async function bootstrap() {
      // Wait for Telegram WebApp SDK to load
      const tg = await waitForTelegramWebApp();

      if (tg) {
        initTelegramApp();
      }

      const initData = getRawInitData();

      if (!initData) {
        // Not running inside Telegram (e.g. plain browser during dev).
        setStatus(getToken() ? "ready" : "error");
        if (!getToken()) setError("This app must be opened from within Telegram.");
        return;
      }

      try {
        await verifyTelegramLogin(initData);
        setStatus("ready");
      } catch (e) {
        setError(e?.response?.data?.error || "Login verification failed");
        setStatus("error");
      }
    }
    bootstrap();
  }, [isAdminRoute]);

  if (status === "loading") {
    return (
      <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p className="muted">Loading Galaxy App…</p>
      </div>
    );
  }

  if (status === "error" && !isAdminRoute) {
    return (
      <div className="screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", textAlign: "center" }}>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* User Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/withdrawal" element={<Withdrawal />} />
        <Route path="/history" element={<History />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedAdminRoute>
              <AdminUsers />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <ProtectedAdminRoute>
              <AdminWithdrawals />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <ProtectedAdminRoute>
              <AdminReferrals />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
      {!isAdminRoute && <TabBar />}
    </>
  );
}

function TabBar() {
  const tabs = [
    { to: "/", label: "🏠 Home" },
    { to: "/tasks", label: "🎯 Tasks" },
    { to: "/referral", label: "👥 Referral" },
    { to: "/withdrawal", label: "💰 Withdraw" },
    { to: "/history", label: "📜 History" },
  ];
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end className={({ isActive }) => (isActive ? "active" : "")}>
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
