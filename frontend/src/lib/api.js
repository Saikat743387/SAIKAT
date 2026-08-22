import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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

export async function verifyTelegramLogin(initData) {
  const { data } = await api.post("/auth/verify", { initData });
  setToken(data.token);
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
