import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { createNote, getNote, updateNote, deleteNote } from "../../services/notesService";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

// ✅ Font whitelist with proper font families
const Font = ReactQuill.Quill.import("formats/font");
Font.whitelist = [
  "arial",
  "georgia",
  "impact",
  "tahoma",
  "times-new-roman",
  "verdana",
  "courier-new",
  "comic-sans",
  "palatino",
  "garamond",
  "bookman",
  "trebuchet"
];
ReactQuill.Quill.register(Font, true);

// ✅ Size whitelist with proper values
const Size = ReactQuill.Quill.import("attributors/style/size");
Size.whitelist = [
  "10px",
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "28px",
  "32px",
  "36px",
  "42px",
  "48px"
];
ReactQuill.Quill.register(Size, true);

// ✅ Toolbar configuration
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: Font.whitelist }],
    [{ size: Size.whitelist }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
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
  const quillRef = useRef(null);

  const baseURL = "http://localhost:5000";

  const searchParams = new URLSearchParams(location.search);
  const editParam = searchParams.get('edit') === 'true';

  const [heading, setHeading] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentJson, setContentJson] = useState({});
  const [plainText, setPlainText] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [isEditing, setIsEditing] = useState(isNew || editParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editorKey, setEditorKey] = useState(0); // Key to force remount

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      getNote(id)
        .then((data) => {
          const note = data.note || data;
          setHeading(note.heading || "");
          
          // Store the HTML content
          const htmlContent = note.contentHtml || "";
          setContentHtml(htmlContent);
          setPlainText(note.plainText || "");

          // If we have contentJson, use it; otherwise let Quill parse the HTML
          if (note.contentJson && typeof note.contentJson === 'object') {
            setContentJson(note.contentJson);
          }

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

  // Force editor to remount when switching to edit mode
  useEffect(() => {
    if (isEditing && !isNew) {
      setEditorKey(prev => prev + 1);
    }
  }, [isEditing, isNew]);

  const handleImageChange = (e) => setNewImages([...newImages, ...e.target.files]);
  const handleRemoveNewImage = (index) => setNewImages(newImages.filter((_, i) => i !== index));
  const handleRemoveExistingImage = (url) => {
    setImagesToDelete([...imagesToDelete, url]);
    setExistingImages(existingImages.filter((i) => i !== url));
  };

  const allImages = [...existingImages, ...newImages.map(img => URL.createObjectURL(img))];
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  const goToImage = (index) => setCurrentImageIndex(index);

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

      {/* Custom styles for fonts and quill editor */}
      <style>{`
        /* Font Picker - Increase width for full text display */
        .ql-snow .ql-picker.ql-font {
          min-width: 160px !important;
        }
        
        .ql-snow .ql-picker.ql-font .ql-picker-label {
          padding-left: 10px !important;
          padding-right: 30px !important;
        }

        /* Font Family Styles */
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="arial"]::before {
          content: 'Arial';
          font-family: Arial, sans-serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="georgia"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="georgia"]::before {
          content: 'Georgia';
          font-family: Georgia, serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="impact"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="impact"]::before {
          content: 'Impact';
          font-family: Impact, sans-serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="tahoma"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="tahoma"]::before {
          content: 'Tahoma';
          font-family: Tahoma, sans-serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="times-new-roman"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="times-new-roman"]::before {
          content: 'Times New Roman';
          font-family: 'Times New Roman', serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="verdana"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="verdana"]::before {
          content: 'Verdana';
          font-family: Verdana, sans-serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="courier-new"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="courier-new"]::before {
          content: 'Courier New';
          font-family: 'Courier New', monospace;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="comic-sans"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="comic-sans"]::before {
          content: 'Comic Sans';
          font-family: 'Comic Sans MS', cursive;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="palatino"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="palatino"]::before {
          content: 'Palatino';
          font-family: 'Palatino Linotype', serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="garamond"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="garamond"]::before {
          content: 'Garamond';
          font-family: Garamond, serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="bookman"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="bookman"]::before {
          content: 'Bookman';
          font-family: 'Bookman Old Style', serif;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="trebuchet"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="trebuchet"]::before {
          content: 'Trebuchet';
          font-family: 'Trebuchet MS', sans-serif;
        }

        .ql-font-arial { font-family: Arial, sans-serif; }
        .ql-font-georgia { font-family: Georgia, serif; }
        .ql-font-impact { font-family: Impact, sans-serif; }
        .ql-font-tahoma { font-family: Tahoma, sans-serif; }
        .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
        .ql-font-verdana { font-family: Verdana, sans-serif; }
        .ql-font-courier-new { font-family: 'Courier New', monospace; }
        .ql-font-comic-sans { font-family: 'Comic Sans MS', cursive; }
        .ql-font-palatino { font-family: 'Palatino Linotype', serif; }
        .ql-font-garamond { font-family: Garamond, serif; }
        .ql-font-bookman { font-family: 'Bookman Old Style', serif; }
        .ql-font-trebuchet { font-family: 'Trebuchet MS', sans-serif; }

        /* Size Picker - Uniform display like MS Word */
        .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          font-size: 14px !important;
        }

        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before {
          content: '10';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before {
          content: '12';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before {
          content: '14';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
          content: '16';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before {
          content: '18';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before {
          content: '20';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before {
          content: '24';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before {
          content: '28';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before {
          content: '32';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="36px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="36px"]::before {
          content: '36';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="42px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="42px"]::before {
          content: '42';
        }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="48px"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="48px"]::before {
          content: '48';
        }

        .quill-editor .ql-container {
          min-height: 300px;
        }
      `}</style>

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
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
                  >
                    Delete
                  </button>
                </>
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

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400">
              {error}
            </div>
          )}

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
                  key={editorKey}
                  ref={quillRef}
                  defaultValue={contentHtml}
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
              <div
                className="ql-editor rounded-xl border border-white/20 bg-zinc-800/80 text-white px-4 py-4 min-h-[16rem] rich-text-content"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}
          </div>

          {/* Images Section */}
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

      {/* Delete Confirmation Modal */}
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
              <span className="font-medium text-white">"{heading || 'this note'}"</span>?
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

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;