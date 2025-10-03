// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { login as loginService, signup as signupService } from "../services/authService";
import api from "../services/api"; // axios instance

// Create Context
const AuthContext = createContext();

// Custom hook for easy usage
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);

  // If we already have a token, set it in axios headers
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Login function
  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await loginService(credentials);
      setToken(data.accessToken); // assuming backend returns { accessToken, user }
      setUser(data.user);
      localStorage.setItem("token", data.accessToken);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (userData) => {
    setLoading(true);
    try {
      const data = await signupService(userData);
      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem("token", data.accessToken);
      return data;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
