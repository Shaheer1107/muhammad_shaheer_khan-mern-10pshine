import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createNote, updateNote } from "../../services/notesService";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

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
  "trebuchet",
];
ReactQuill.Quill.register(Font, true);

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
  "48px",
];
ReactQuill.Quill.register(Size, true);

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

const EditNote = ({
  id,
  isNew,
  heading,
  setHeading,
  contentHtml,
  setContentHtml,
  contentJson,
  setContentJson,
  plainText,
  setPlainText,
  existingImages,
  setExistingImages,
  error,
  setError,
}) => {
  const navigate = useNavigate();
  const quillRef = useRef(null);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editorKey, setEditorKey] = useState(0);

  // AI Generation states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateStyle, setGenerateStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    if (!isNew) {
      setEditorKey((prev) => prev + 1);
    }
  }, [isNew]);

  const handleImageChange = (e) =>
    setNewImages([...newImages, ...e.target.files]);
  const handleRemoveNewImage = (index) =>
    setNewImages(newImages.filter((_, i) => i !== index));
  const handleRemoveExistingImage = (url) => {
    setImagesToDelete([...imagesToDelete, url]);
    setExistingImages(existingImages.filter((i) => i !== url));
  };

  const allImages = [
    ...existingImages,
    ...newImages.map((img) => URL.createObjectURL(img)),
  ];

const handleGenerateNote = async () => {
  if (!generateTopic.trim()) {
    setGenerateError("Please enter a topic");
    return;
  }

  setIsGenerating(true);
  setGenerateError("");

  try {
    const response = await fetch("http://localhost:5000/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: generateTopic,
        style: generateStyle,
        max_new_tokens: 300,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Show the actual error message from backend
      throw new Error(data.error || "Failed to generate note");
    }

    const generatedNote = data.note || "";

    if (!generatedNote.trim()) {
      throw new Error("AI returned empty content. Please try again.");
    }

    // Convert plain text to HTML with proper formatting
    const formattedHtml = generatedNote
      .split("\n\n")
      .filter((para) => para.trim()) // Remove empty paragraphs
      .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
      .join("");

    // Set the generated content in the editor
    setContentHtml(formattedHtml);

    // If heading is empty, set it to the topic
    if (!heading.trim()) {
      setHeading(generateTopic);
    }

    // Update plainText
    setPlainText(generatedNote);

    // Close modal
    setShowGenerateModal(false);
    setGenerateTopic("");
    setGenerateStyle("");

    // Force editor refresh
    setEditorKey((prev) => prev + 1);
  } catch (err) {
    console.error("Generate error:", err);
    setGenerateError(err.message || "Failed to generate note. Please try again.");
  } finally {
    setIsGenerating(false);
  }
};

  const handleSave = async () => {
    if (!heading.trim() && !contentHtml.trim())
      return setError("Note cannot be empty.");

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

    if (imagesToDelete.length)
      formData.append("imagesToDelete", JSON.stringify(imagesToDelete));

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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <style>{`
        .ql-snow .ql-picker.ql-font {
          min-width: 160px !important;
        }
        
        .ql-snow .ql-picker.ql-font .ql-picker-label {
          padding-left: 10px !important;
          padding-right: 30px !important;
        }

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

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="mx-auto max-w-4xl w-full space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">
              {isNew ? "Create Note" : "Edit Note"}
            </h1>
            <div className="flex gap-3">
              {isNew && (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-white font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  Generate Note
                </button>
              )}
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2 text-white font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-white/80 text-sm mb-2 block">
              Note Title
            </label>
            <input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full rounded-xl bg-zinc-800/80 text-white px-4 py-3 border border-white/20 focus:border-fuchsia-400 outline-none"
              placeholder="Enter note title..."
            />
          </div>

          <div>
            <label className="text-white/80 text-sm mb-2 block">Content</label>
            <div className="bg-white rounded-xl overflow-hidden">
              <ReactQuill
                key={editorKey}
                ref={quillRef}
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
          </div>

          <div>
            <label className="text-white/80 text-sm mb-2 block">Images</label>
            <div className="mb-4">
              <input
                name="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-500/20 file:text-fuchsia-300 hover:file:bg-fuchsia-500/30 file:cursor-pointer cursor-pointer"
              />
              <p className="text-xs text-white/60 mt-1">
                Select multiple images to add to your note
              </p>
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
          </div>
        </div>
      </div>

      {/* Generate Note Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-slate-900/95 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
                <svg
                  className="w-5 h-5 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Generate Note with AI
                </h3>
                <p className="text-sm text-white/70">
                  Let AI create a note for you
                </p>
              </div>
            </div>

            {generateError && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
                {generateError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-white/80 text-sm mb-2 block">
                  Topic <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis, World War II, Python Basics"
                  className="w-full rounded-xl bg-zinc-800/80 text-white px-4 py-3 border border-white/20 focus:border-violet-400 outline-none"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">
                  Tone/Style (Optional)
                </label>
                <select
                  value={generateStyle}
                  onChange={(e) => setGenerateStyle(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800/80 text-white px-4 py-3 border border-white/20 focus:border-violet-400 outline-none"
                >
                  <option value="">Default</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="detailed">Detailed</option>
                  <option value="simple">Simple</option>
                  <option value="technical">Technical</option>
                  <option value="creative">Creative</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateTopic("");
                  setGenerateStyle("");
                  setGenerateError("");
                }}
                disabled={isGenerating}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateNote}
                disabled={isGenerating || !generateTopic.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </div>
                ) : (
                  "Generate"
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
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default EditNote;