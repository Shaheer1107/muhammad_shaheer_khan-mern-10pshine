import api from "./api";

export const signup = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials, {
    withCredentials: true,
  });
  return response.data;
};