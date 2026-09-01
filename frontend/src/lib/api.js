import axios from "axios";

// Use explicit env var in production; fall back to same-origin (Vercel) or localhost for dev.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:5000/api");

export const api = axios.create({ baseURL: API_BASE_URL });

const TOKEN_KEY = "galaxy_app_token";

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: clear token and notify on 403 (blocked) or 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403) {
      const reason = error?.response?.data?.reason || "Your account has been blocked.";
      const blockedAt = error?.response?.data?.blockedAt;
      clearToken();
      // Persist blocked info for App.jsx to read
      localStorage.setItem(
        "galaxy_blocked_reason",
        JSON.stringify({ reason, blockedAt })
      );
    }
    return Promise.reject(error);
  }
);

export async function verifyTelegramLogin(initData) {
  const { data } = await api.post("/auth/verify", { initData });
  setToken(data.token);
  // Clear blocked flag — user can now re-access the app if unblocked
  localStorage.removeItem("galaxy_blocked_reason");
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/user/me");
  return data;
}

export async function claimDaily() {
  const { data } = await api.post("/user/daily-claim");
  return data;
}

export async function claimAdReward(adRef) {
  const { data } = await api.post("/ads/reward", { adRef });
  return data;
}

export async function fetchReferralInfo() {
  const { data } = await api.get("/referral/me");
  return data;
}

export async function fetchReferralHistory() {
  const { data } = await api.get("/referral/history");
  return data;
}

export async function requestWithdrawal(payload) {
  const { data } = await api.post("/withdrawal/request", payload);
  return data;
}

export async function fetchWithdrawalHistory() {
  const { data } = await api.get("/user/history/withdrawals");
  return data;
}

export async function fetchCoinHistory() {
  const { data } = await api.get("/user/history/coins");
  return data;
}
