import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Response interceptor: redirect to login when session expires (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes("/login") &&
      !window.location.pathname.includes("/register") &&
      !window.location.pathname.includes("/forgot-password") &&
      !window.location.pathname.includes("/reset-password")
    ) {
      // Session expired or not authenticated — redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
