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

export const getUserData = async () => {
  const response = await api.get("/user/me");
  return response.data;
};

export const updateUserProfile = async (userData) => {
  const response = await api.put("/user/me", userData);
  return response.data;
};

export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("profileImage", file);
  
  const response = await api.post("/user/me/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};