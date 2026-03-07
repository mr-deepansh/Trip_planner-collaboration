import React, { createContext, useState, useEffect } from "react";
import api from "../api/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/auth/me");
        if (res.data.success) {
          setUser(res.data.data);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.data.user);
    return res;
  };

  const register = async (name, email, password) => {
    return await api.post("/auth/register", { name, email, password });
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  const forgotPassword = async (email) => {
    return await api.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (token, password) => {
    return await api.patch(`/auth/reset-password/${token}`, { password });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
