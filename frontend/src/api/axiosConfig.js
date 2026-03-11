import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Endpoints that are SOFT auth probes — a 401 from these is expected
// and should NOT trigger a redirect (AuthContext handles its own error state)
const SOFT_AUTH_ENDPOINTS = ["/auth/me"];

let isRedirecting = false; // prevent double-redirect race condition

// Response interceptor: redirect to login only on real session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const status = error.response?.status;

    const isSoftProbe = SOFT_AUTH_ENDPOINTS.some((ep) => url.includes(ep));
    const isAuthPage =
      window.location.pathname.startsWith("/login") ||
      window.location.pathname.startsWith("/register") ||
      window.location.pathname.startsWith("/forgot-password") ||
      window.location.pathname.startsWith("/reset-password");

    if (status === 401 && !isSoftProbe && !isAuthPage && !isRedirecting) {
      // Real session expiry on a protected data endpoint — redirect to login
      isRedirecting = true;
      setTimeout(() => {
        isRedirecting = false;
      }, 3000);
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;
