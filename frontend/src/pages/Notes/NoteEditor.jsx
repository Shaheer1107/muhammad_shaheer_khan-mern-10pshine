import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { createNote, getNote, updateNote, deleteNote } from "../../services/notesService";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "blockquote", "code-block", "clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "link",
  "blockquote",
  "code-block",
];

const NoteEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isNew = !id || id === "new";

  const baseURL = "http://localhost:5000"; // ✅ image base URL

  const [heading, setHeading] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentJson, setContentJson] = useState({});
  const [plainText, setPlainText] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [isEditing, setIsEditing] = useState(isNew);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ Load note if editing/viewing existing one
  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      getNote(id)
        .then((data) => {
          const note = data.note || data;
          setHeading(note.heading || "");
          setContentHtml(note.contentHtml || "");
          setPlainText(note.plainText || "");

          const attachments = note.attachments ?? note.images ?? [];
          const imgs = attachments
            .map((a) => {
              if (!a) return null;
              if (typeof a === "object") {
                if (a.url) return a.url;
                if (a.filename) return `${baseURL}/uploads/${a.filename}`;
                return null;
              }
              if (typeof a === "string") {
                return a.startsWith("http")
                  ? a
                  : `${baseURL}/uploads/${a.replace(/^uploads[\\/]/, "")}`;
              }
              return null;
            })
            .filter(Boolean);

          setExistingImages(imgs);
        })
        .catch((err) => setError(err?.response?.data?.message || "Failed to load note."))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  // ✅ Image handling
  const handleImageChange = (e) => setNewImages([...newImages, ...e.target.files]);
  const handleRemoveNewImage = (index) => setNewImages(newImages.filter((_, i) => i !== index));
  const handleRemoveExistingImage = (url) => {
    setImagesToDelete([...imagesToDelete, url]);
    setExistingImages(existingImages.filter((i) => i !== url));
  };

  // ✅ Save note
  const handleSave = async () => {
    if (!heading.trim() && !contentHtml.trim()) return setError("Note cannot be empty.");

    const formData = new FormData();
    formData.append("heading", heading);
    formData.append("contentHtml", contentHtml);
    formData.append("contentJson", JSON.stringify(contentJson));
    formData.append("plainText", plainText);

    if (existingImages.length) {
      const attachmentsPayload = existingImages.map((url) => ({ url }));
      formData.append("attachments", JSON.stringify(attachmentsPayload));
    } else {
      formData.append("attachments", JSON.stringify([]));
    }

    newImages.forEach((f) => formData.append("files", f));
    if (imagesToDelete.length) formData.append("imagesToDelete", JSON.stringify(imagesToDelete));

    try {
      setLoading(true);
      if (isNew) await createNote(formData);
      else await updateNote(id, formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save note.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete note
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote(id);
      navigate("/dashboard");
    } catch {
      setError("Failed to delete note.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">
              {isNew ? "Create Note" : isEditing ? "Edit Note" : "View Note"}
            </h1>
            <div className="flex gap-3">
              {!isNew && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              >
                Back
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">Note Title</label>
            {isEditing ? (
              <input
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                className="w-full rounded-xl bg-zinc-800/80 text-white px-4 py-3 border border-white/20 focus:border-fuchsia-400 outline-none"
              />
            ) : (
              <div className="rounded-xl bg-zinc-800/80 text-white px-4 py-3 border border-white/20">
                {heading || <em className="text-white/50">Untitled</em>}
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">Content</label>
            {isEditing ? (
              <ReactQuill
                value={contentHtml}
                onChange={(html, delta, source, editor) => {
                  setContentHtml(html);
                  setContentJson(editor.getContents());
                  setPlainText(editor.getText());
                }}
                theme="snow"
                modules={modules}
                formats={formats}
                className="bg-white text-black rounded-xl"
              />
            ) : (
              <div
                className="rounded-xl border border-white/20 bg-zinc-800/80 text-white px-4 py-4 min-h-[16rem] ql-editor"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}
          </div>

          {/* ✅ Images Section */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">Images</label>

            {isEditing ? (
              <>
                <input type="file" multiple onChange={handleImageChange} className="text-white" />

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Existing images */}
                  {existingImages.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg border border-white/20"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <button
                        onClick={() => handleRemoveExistingImage(url)}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Newly added images */}
                  {newImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img
                        src={URL.createObjectURL(img)}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg border border-white/20"
                      />
                      <button
                        onClick={() => handleRemoveNewImage(i)}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* ✅ View mode image preview */}
                {existingImages.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {existingImages.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Note image ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-white/20"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-white/50 italic">No images attached.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 p-6 rounded-2xl max-w-sm w-full text-white">
            <p>Are you sure you want to delete this note?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-white/30 py-2 rounded-lg">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-red-500 py-2 rounded-lg">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
