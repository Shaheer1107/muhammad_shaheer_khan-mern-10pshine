import api from "./api";

/**
 * Fetch all notes for the logged-in user
 */
export const getNotes = async () => {
  const res = await api.get("/notes");
  return res.data;
};

/**
 * Fetch a single note by its ID
 * @param {string} id - Note ID
 */
export const getNote = async (id) => {
  const res = await api.get(`/notes/${id}`);
  return res.data;
};

/**
 * Create a new note (supports images)
 * @param {Object|FormData} payload - Note data (FormData preferred)
 */
export const createNote = async (payload) => {
  let dataToSend = payload;

  // If payload is a plain object, convert to FormData
  if (!(payload instanceof FormData)) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(`${key}[]`, v));
      } else {
        formData.append(key, value);
      }
    });
    dataToSend = formData;
  }

  const res = await api.post("/notes", dataToSend, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Update an existing note by ID (supports images)
 * @param {string} id - Note ID
 * @param {Object|FormData} payload - Updated note data (FormData preferred)
 */
export const updateNote = async (id, payload) => {
  let dataToSend = payload;

  // Convert object to FormData if needed
  if (!(payload instanceof FormData)) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(`${key}[]`, v));
      } else {
        formData.append(key, value);
      }
    });
    dataToSend = formData;
  }

  const res = await api.put(`/notes/${id}`, dataToSend, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/**
 * Delete a note by ID
 * @param {string} id - Note ID
 */
export const deleteNote = async (id) => {
  const res = await api.delete(`/notes/${id}`);
  return res.data;
};
