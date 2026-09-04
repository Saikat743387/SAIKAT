import axios from "axios";

// Use explicit env var in production; fall back to same-origin (Vercel) or localhost for dev.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:5000/api");

export const adminApi = axios.create({ baseURL: API_BASE_URL });

const ADMIN_TOKEN_KEY = "admin_token";

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem("admin_username");
}

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: clear token and redirect on 401
adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearAdminToken();
      // Use window.location for admin pages to force a full reload
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      }
    }
    return Promise.reject(err);
  }
);

// ---- Admin API helpers ----

export async function adminLogin(username, password) {
  const { data } = await adminApi.post("/admin/login", { username, password });
  setAdminToken(data.token);
  return data;
}

export async function fetchAdminDashboard() {
  const { data } = await adminApi.get("/admin/dashboard");
  return data;
}

export async function fetchAdminUsers(params = {}) {
  const { data } = await adminApi.get("/admin/users/search", { params });
  return data;
}

export async function fetchAdminUsersList(params = {}) {
  const { data } = await adminApi.get("/admin/users", { params });
  return data;
}

export async function fetchAdminUserDetails(userId) {
  const { data } = await adminApi.get(`/admin/users/${userId}`);
  return data;
}

export async function toggleBlockUser(userId, action, reason) {
  const { data } = await adminApi.post(`/admin/users/${userId}/block`, { action, reason });
  return data;
}

export async function fetchAdminWithdrawals(params = {}) {
  const { data } = await adminApi.get("/admin/withdrawals", { params });
  return data;
}

export async function approveWithdrawal(withdrawalId, note) {
  const { data } = await adminApi.post(`/admin/withdrawals/${withdrawalId}/approve`, { note });
  return data;
}

export async function rejectWithdrawal(withdrawalId, note) {
  const { data } = await adminApi.post(`/admin/withdrawals/${withdrawalId}/reject`, { note });
  return data;
}

export async function fetchAdminReferrals(params = {}) {
  const { data } = await adminApi.get("/admin/referrals", { params });
  return data;
}
