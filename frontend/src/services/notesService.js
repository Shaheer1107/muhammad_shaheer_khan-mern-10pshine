import api from "./api";

/**
 * Fetch all notes for the logged-in user (with optional search + filter)
 * @param {Object} options - Optional parameters
 * @param {string} [options.q] - Search query
 * @param {string} [options.filterType] - Filter type (e.g., "today", "last_7_days", "last_month")
 * @param {number} [options.limit] - Max number of notes to fetch
 * @param {number} [options.skip] - Number of notes to skip (for pagination)
 */
// Updated getNotes with sort + date range support
export const getNotes = async ({
  q,
  filterType,
  limit,
  skip,
  sortBy,
  sortOrder,
  startDate,
  endDate,
} = {}) => {
  const params = new URLSearchParams();

  // Search & preset filter
  if (typeof q !== "undefined" && q !== null && q !== "") params.append("q", q);
  if (typeof filterType !== "undefined" && filterType !== null && filterType !== "")
    params.append("filterType", filterType);

  // Pagination: allow 0 as valid value
  if (typeof limit !== "undefined" && limit !== null) params.append("limit", String(limit));
  if (typeof skip !== "undefined" && skip !== null) params.append("skip", String(skip));

  // Sorting
  if (typeof sortBy !== "undefined" && sortBy !== null && sortBy !== "")
    params.append("sortBy", sortBy);
  if (typeof sortOrder !== "undefined" && sortOrder !== null && sortOrder !== "")
    params.append("sortOrder", sortOrder);

  // Date range: accept Date or string; normalize to YYYY-MM-DD
  const normalizeDate = (d) => {
    if (!d && d !== 0) return null;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.toISOString().split("T")[0]; // YYYY-MM-DD
    }
    // assume string already in a valid format (backend expects YYYY-MM-DD)
    return String(d);
  };

  const s = normalizeDate(startDate);
  const e = normalizeDate(endDate);
  if (s) params.append("startDate", s);
  if (e) params.append("endDate", e);

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const res = await api.get(`/notes${queryString}`);
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
