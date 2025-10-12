import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { createNote, getNote, updateNote, deleteNote } from "../../services/notesService";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

// ✅ Font whitelist
const Font = ReactQuill.Quill.import("formats/font");
Font.whitelist = [
  "sans-serif",
  "serif",
  "monospace",
  "arial",
  "times-new-roman",
  "courier-new",
];
ReactQuill.Quill.register(Font, true);

// ✅ Size whitelist
const Size = ReactQuill.Quill.import("attributors/style/size");
Size.whitelist = [
  "8px",
  "10px",
  "12px",
  "14px",
  "18px",
  "24px",
  "36px",
  "48px",
];
ReactQuill.Quill.register(Size, true);

// ✅ Toolbar configuration
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: Font.whitelist }],
    [{ size: Size.whitelist }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }], // 🎨 color pickers
    [{ align: [] }],                     // 📐 alignment
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "blockquote", "code-block"],
    ["clean"],
  ],
};

// ✅ Supported formats
const formats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "align",
  "list",
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // ✅ Carousel navigation
  const allImages = [...existingImages, ...newImages.map(img => URL.createObjectURL(img))];
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  const goToImage = (index) => setCurrentImageIndex(index);

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

    // ✅ match backend multer field name ("images")
    newImages.forEach((f) => formData.append("images", f));

    if (imagesToDelete.length) formData.append("imagesToDelete", JSON.stringify(imagesToDelete));

    console.log("🧾 FormData before saving:", [...formData.entries()]);

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="mx-auto max-w-4xl w-full space-y-6">
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
                <h1 className="text-2xl font-bold text-white">
                  {heading || <em className="text-white/50">Untitled</em>}
                </h1>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">Content</label>
            {isEditing ? (
              <div className="bg-white rounded-xl overflow-hidden">
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
                  className="quill-editor"
                />
              </div>
            ) : (
              // ✅ UPDATED: Properly render saved rich text
              <div
                className="rounded-xl border border-white/20 bg-zinc-800/80 text-white px-4 py-4 min-h-[16rem] rich-text-content"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}
          </div>

          {/* ✅ Images Section */}
          <div>
            <label className="text-white/80 text-sm mb-2 block">Images</label>

            {isEditing ? (
              <>
                <div className="mb-4">
                  <input 
                    name="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-500/20 file:text-fuchsia-300 hover:file:bg-fuchsia-500/30 file:cursor-pointer cursor-pointer"
                  />
                  <p className="text-xs text-white/60 mt-1">Select multiple images to add to your note</p>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {existingImages.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        onClick={() => setSelectedImage(url)}
                      />
                      <button
                        onClick={() => handleRemoveExistingImage(url)}
                        className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {newImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(img)}
                        alt=""
                        className="w-full h-32 object-cover rounded-lg border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedImage(URL.createObjectURL(img))}
                      />
                      <button
                        onClick={() => handleRemoveNewImage(i)}
                        className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {allImages.length > 0 ? (
                  <div className="mt-6">
                    <div className="relative bg-zinc-800/50 rounded-2xl p-4 border border-white/10 image-carousel-container">
                      <div className="relative aspect-video bg-zinc-900/50 rounded-xl overflow-hidden mb-4 image-carousel-main">
                        <img
                          src={allImages[currentImageIndex]}
                          alt={`Note image ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                          onClick={() => setSelectedImage(allImages[currentImageIndex])}
                        />
                        
                        {allImages.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={nextImage}
                              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>

                      {allImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide image-carousel-thumbnails">
                          {allImages.map((url, index) => (
                            <button
                              key={index}
                              onClick={() => goToImage(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all image-carousel-thumbnail ${
                                index === currentImageIndex
                                  ? 'border-fuchsia-400 ring-2 ring-fuchsia-400/30'
                                  : 'border-white/20 hover:border-white/40'
                              }`}
                            >
                              <img
                                src={url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.style.display = "none")}
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="text-center text-sm text-white/60 mt-2">
                        {currentImageIndex + 1} of {allImages.length}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/50 italic">No images attached.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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

      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full size" onClick={(e) => e.stopPropagation()} />
          <button
            className="image-modal-close"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
