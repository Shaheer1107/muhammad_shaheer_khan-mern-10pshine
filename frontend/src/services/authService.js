import api from "./api";

export const signup = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};
