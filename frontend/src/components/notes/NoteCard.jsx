import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteNote } from "../../services/notesService";

const NoteCard = ({ note, onRefresh }) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const BASE_URL = API_URL.replace(/\/api$/, "");

  const id = note._id || note.id;
  const heading = note.heading || "Untitled Note";
  const contentHtml = note.contentHtml || "";
  const plainText = note.plainText || "";
  const attachments = note.attachments ?? note.images ?? [];
  const updated = note.updatedAt || note.createdAt || null;
  const date = updated ? new Date(updated).toLocaleDateString() : "";

  const getImageUrl = (img) => {
    if (!img) return null;
    if (typeof img === "object") {
      if (img.url) return img.url;
      if (img.filename) return `${BASE_URL}/uploads/${img.filename}`;
      return null;
    }
    if (typeof img === "string") {
      return img.startsWith("http")
        ? img
        : `${BASE_URL}/uploads/${img.replace(/^uploads[\\/]/, "")}`;
    }
    return null;
  };

  const firstImageUrl = attachments.length > 0 ? getImageUrl(attachments[0]) : null;

  const handleDelete = async (e) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteNote(id);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCardClick = () => navigate(`/notes/${id}`);
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };
  const handleClickToEdit = (e) => {
    e.stopPropagation();
    navigate(`/notes/${id}?edit=true`);
  };

  const snippet = plainText?.length > 180 ? plainText.slice(0, 177) + "…" : plainText;

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative h-full cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(168,85,247,0.15)] hover:-translate-y-1"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-indigo-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="flex-1 text-base font-semibold text-white line-clamp-2 leading-tight">
              {heading}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDeleteClick}
                className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                title="Delete note"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                  <path d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L5.05 6.5l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951z" />
                </svg>
              </button>
            </div>
          </div>

          {firstImageUrl && (
            <div className="mb-2 overflow-hidden rounded-lg">
              <img
                src={firstImageUrl}
                alt="Note preview"
                className="w-full h-32 object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          <div className="flex-1 text-sm text-white/80 overflow-hidden">
            {contentHtml ? (
              <div
                className="line-clamp-4 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            ) : (
              <p className="line-clamp-4 italic text-white/60">{snippet}</p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div
              role="button"
              onClick={handleClickToEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClickToEdit(e);
              }}
              tabIndex={0}
              className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 cursor-pointer select-none"
              title="Edit note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
              </svg>
              <span>Click to edit</span>
            </div>
            {date && <span className="text-xs text-white/50">{date}</span>}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-slate-900/95 p-6 shadow-2xl ring-1 ring-white/10">
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
              <span className="font-medium text-white">"{heading}"</span>?
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
    </>
  );
};

export default NoteCard;
