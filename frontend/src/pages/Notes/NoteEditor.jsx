import { useEffect, useState } from "react";
import { createNote, getNote, updateNote, deleteNote } from "../../services/notesService";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const NoteEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // "new" for new note, otherwise note id
  const location = useLocation();
  const isNew = !id || id === "new";

  // read query param ?edit=true
  const searchParams = new URLSearchParams(location.search);
  const wantsEditFromQuery = searchParams.get("edit") === "true";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // initial editing state: true for new notes OR if query asked edit
  const [isEditing, setIsEditing] = useState(isNew || wantsEditFromQuery);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch note details when route/id or location.search changes, and sync editing mode
  useEffect(() => {
    // recompute wantsEdit when location.search changes
    const qp = new URLSearchParams(location.search);
    const wantsEdit = qp.get("edit") === "true";

    setIsEditing(isNew || wantsEdit);
    setError("");

    if (!isNew) {
      setLoading(true);
      getNote(id)
        .then((data) => {
          // handle either { note: {...} } or {...}
          const noteData = data?.note || data || {};
          setTitle(noteData.title || "");
          setContent(noteData.content || "");
        })
        .catch((err) => {
          setError(err?.response?.data?.message || "Failed to load note.");
        })
        .finally(() => setLoading(false));
    } else {
      setTitle("");
      setContent("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, location.search]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      setError("Note cannot be empty.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isNew) {
        await createNote({ title, content });
      } else {
        await updateNote(id, { title, content });
      }
      navigate("/dashboard"); // back to notes list
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save note.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError("");
    try {
      await deleteNote(id);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete note.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 relative">
      {/* Decorative background elements (kept inside overflow-hidden to avoid scroll) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-3xl bg-gradient-to-tr from-purple-300/10 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent">
                {isNew ? "Create New Note" : isEditing ? "Edit Note" : "View Note"}
              </h1>
              <p className="mt-1 text-white/70 text-sm sm:text-base">
                {isNew ? "Start writing your thoughts" : isEditing ? "Update your note" : "Read your note"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isNew && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                    </svg>
                    Edit
                  </span>
                </button>
              )}

              {!isNew && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 backdrop-blur-sm transition hover:bg-red-500/20 hover:border-red-500/50"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L5.05 6.5l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" />
                    </svg>
                    Delete
                  </span>
                </button>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
              >
                Cancel
              </button>

              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-5 py-2.5 sm:px-6 sm:py-3 font-semibold text-white shadow-lg transition duration-200 ease-out hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)] disabled:opacity-50"
                >
                  <span className="relative z-10 inline-flex items-center gap-2">
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Save
                      </>
                    )}
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-white/20 transition group-hover:translate-x-0" />
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-red-200 shadow-sm">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Editor / Viewer */}
          <div className="rounded-3xl bg-white/5 backdrop-blur-xl p-6 sm:p-8 ring-1 ring-white/10">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/90">Note Title</label>
                {isEditing ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your note title..."
                    className="w-full rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-fuchsia-300/60 focus:bg-zinc-800/90 focus:shadow-[0_0_0_3px_rgba(217,70,239,0.12)]"
                  />
                ) : (
                  <div className="rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white">
                    {title || <span className="text-white/50 italic">Untitled</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/90">Content</label>
                {isEditing ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your note here..."
                    rows={14}
                    className="w-full resize-y rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white placeholder-white/40 outline-none transition focus:border-violet-300/60 focus:bg-zinc-800/90 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.12)]"
                  />
                ) : (
                  <div className="rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white min-h-[18rem] sm:min-h-[24rem] whitespace-pre-wrap">
                    {content || <span className="text-white/50 italic">No content</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900/95 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-400">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">Delete Note</h3>
                <p className="text-sm text-white/70">This action cannot be undone</p>
              </div>
            </div>

            <p className="mb-6 text-white/80">
              Are you sure you want to delete{" "}
              <span className="font-medium text-white">{title || "Untitled"}</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </div>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
