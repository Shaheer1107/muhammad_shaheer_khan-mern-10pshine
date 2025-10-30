import api from "./api";

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

export const deleteProfileImage = async () => {
  const response = await api.delete("/user/me/upload");
  return response.data;
};

export const changeUserPassword = async (currentPassword, newPassword) => {
  const response = await api.put("/user/me/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};