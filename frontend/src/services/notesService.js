import api from "./api";

export const getNotes = async () => {
  const res = await api.get("/notes");
  return res.data;
};

export const getNote = async (id) => {
  const res = await api.get(`/notes/${id}`);
  return res.data;
};

export const createNote = async (payload) => {
  const res = await api.post("/notes", payload);
  return res.data;
};

export const updateNote = async (id, payload) => {
  const res = await api.put(`/notes/${id}`, payload);
  return res.data;
};

export const deleteNote = async (id) => {
  const res = await api.delete(`/notes/${id}`);
  return res.data;
};
