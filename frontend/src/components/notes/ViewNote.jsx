import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteNote } from "../../services/notesService";
import html2pdf from "html2pdf.js";

const ViewNote = ({
  id,
  heading,
  contentHtml,
  existingImages,
  setIsEditing,
  error,
  setError,
}) => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allImages = existingImages;

  const nextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () =>
    setCurrentImageIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length
    );
  const goToImage = (index) => setCurrentImageIndex(index);

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

  const imgElementToDataUrl = async (imgEl) => {
    return new Promise(async (resolve) => {
      try {
        if (!imgEl.src) return resolve(null);
        if (imgEl.src.startsWith("data:")) return resolve(imgEl.src);

        const res = await fetch(imgEl.src, { mode: "cors" });
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      } catch (e) {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = imgEl.naturalWidth || imgEl.width;
          canvas.height = imgEl.naturalHeight || imgEl.height;
          ctx.drawImage(imgEl, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          resolve(null);
        }
      }
    });
  };

  const convertImagesInNodeToDataUrls = async (node) => {
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        const dataUrl = await imgElementToDataUrl(img);
        if (dataUrl) {
          img.setAttribute("src", dataUrl);
        } else {
          img.setAttribute("crossorigin", "anonymous");
        }
      })
    );
  };

  const handleDownloadPDF = async () => {
    try {
      const src = document.createElement("div");
      src.style.boxSizing = "border-box";
      src.style.width = "794px";
      src.style.padding = "24px";
      src.style.background = "#ffffff";
      src.style.color = "#000";
      src.style.fontFamily = "Arial, sans-serif";
      src.style.lineHeight = "1.45";

      const quillCssLink = document.createElement("link");
      quillCssLink.rel = "stylesheet";
      quillCssLink.href =
        "https://cdn.jsdelivr.net/npm/quill/dist/quill.snow.css";
      src.prepend(quillCssLink);

      const inlineStyle = document.createElement("style");
      inlineStyle.textContent = `
      body, .ql-editor {
        color: #000 !important;
        font-family: Arial, sans-serif !important;
      }
      .ql-align-center { text-align: center; }
      .ql-align-right { text-align: right; }
      .ql-align-justify { text-align: justify; }
      .ql-font-arial { font-family: Arial, sans-serif; }
      .ql-font-georgia { font-family: Georgia, serif; }
      .ql-font-tahoma { font-family: Tahoma, sans-serif; }
      .ql-font-verdana { font-family: Verdana, sans-serif; }
      .ql-font-times-new-roman { font-family: "Times New Roman", serif; }
      .ql-font-courier-new { font-family: "Courier New", monospace; }
      .ql-font-garamond { font-family: Garamond, serif; }
      .ql-font-bookman { font-family: "Bookman Old Style", serif; }
      .ql-font-trebuchet { font-family: "Trebuchet MS", sans-serif; }
      .ql-font-comic-sans { font-family: "Comic Sans MS", cursive; }
      .ql-size-10px { font-size: 10px; }
      .ql-size-12px { font-size: 12px; }
      .ql-size-14px { font-size: 14px; }
      .ql-size-16px { font-size: 16px; }
      .ql-size-18px { font-size: 18px; }
      .ql-size-20px { font-size: 20px; }
      .ql-size-24px { font-size: 24px; }
      .ql-size-28px { font-size: 28px; }
      .ql-size-32px { font-size: 32px; }
      .ql-size-36px { font-size: 36px; }
      .ql-size-42px { font-size: 42px; }
      .ql-size-48px { font-size: 48px; }
      img { max-width: 100%; height: auto; }
      blockquote {
        border-left: 4px solid #ccc;
        margin: 0.5em 0;
        padding-left: 1em;
        color: #555;
      }
      code {
        background: #f4f4f4;
        padding: 2px 4px;
        border-radius: 4px;
        font-family: monospace;
      }
      @page {
        margin: 20mm;
      }
      h1 {
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 12px;
      }
      .pdf-images-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 2px solid #e5e5e5;
      }
      .pdf-images-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
        color: #333;
      }
      .pdf-image-container {
        margin-bottom: 16px;
        page-break-inside: avoid;
      }
      .pdf-image {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
    `;
      src.prepend(inlineStyle);

      const titleEl = document.createElement("h1");
      titleEl.textContent = heading || "Untitled";
      titleEl.style.margin = "0 0 12px 0";
      titleEl.style.fontSize = "20px";
      src.appendChild(titleEl);

      const contentWrapper = document.createElement("div");
      contentWrapper.className = "pdf-content ql-editor";
      contentWrapper.innerHTML = contentHtml || "";

      const styleTag = document.createElement("style");
      styleTag.innerHTML = `
      .ql-editor { white-space: normal; font-size: 14px; }
      .ql-editor img { max-width: 100%; height: auto; display: block; margin: 6px 0; }
      .ql-editor pre { white-space: pre-wrap; word-wrap: break-word; }
      h1, h2, h3 { page-break-after: avoid; }
      p, li { orphans: 2; widows: 2; }
    `;
      contentWrapper.prepend(styleTag);

      src.appendChild(contentWrapper);

      if (allImages.length > 0) {
        const imagesSection = document.createElement("div");
        imagesSection.className = "pdf-images-section";

        const imagesTitle = document.createElement("div");
        imagesTitle.className = "pdf-images-title";
        imagesTitle.textContent = "Attached Images";
        imagesSection.appendChild(imagesTitle);

        for (const imageUrl of allImages) {
          const imageContainer = document.createElement("div");
          imageContainer.className = "pdf-image-container";

          const img = document.createElement("img");
          img.className = "pdf-image";
          img.src = imageUrl;
          img.alt = "Note attachment";

          imageContainer.appendChild(img);
          imagesSection.appendChild(imageContainer);
        }

        src.appendChild(imagesSection);
      }

      document.body.appendChild(src);

      await Promise.all(
        Array.from(src.querySelectorAll("img")).map(
          (img) =>
            new Promise((res) => {
              if (img.complete) return res();
              img.onload = img.onerror = () => res();
            })
        )
      );

      await convertImagesInNodeToDataUrls(src);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${(heading || "note").replace(/[\\/:"*?<>|]+/g, "")}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(src).save();

      document.body.removeChild(src);
    } catch (err) {
      console.error("PDF generation failed", err);
      setError("Failed to generate PDF. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="mx-auto max-w-4xl w-full space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">View Note</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              >
                Edit
              </button>
              <button
                onClick={handleDownloadPDF}
                className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                title="Download PDF"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                title="Delete Note"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20"
              >
                Back
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
            <div className="rounded-xl bg-zinc-800/80 text-white px-4 py-3 border border-white/20">
              <h1 className="text-2xl font-bold text-white">
                {heading || <em className="text-white/50">Untitled</em>}
              </h1>
            </div>
          </div>

          <div>
            <label className="text-white/80 text-sm mb-2 block">Content</label>
            <div
              className="ql-editor rounded-xl border border-white/20 bg-zinc-800/80 text-white px-4 py-4 min-h-[16rem] rich-text-content"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>

          <div>
            <label className="text-white/80 text-sm mb-2 block">Images</label>
            {allImages.length > 0 ? (
              <div className="mt-6">
                <div className="relative bg-zinc-800/50 rounded-2xl p-4 border border-white/10 image-carousel-container">
                  <div className="relative aspect-video bg-zinc-900/50 rounded-xl overflow-hidden mb-4 image-carousel-main">
                    <img
                      src={allImages[currentImageIndex]}
                      alt={`Note image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      onClick={() =>
                        setSelectedImage(allImages[currentImageIndex])
                      }
                    />

                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
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
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
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
                              d="M9 5l7 7-7 7"
                            />
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
                              ? "border-fuchsia-400 ring-2 ring-fuchsia-400/30"
                              : "border-white/20 hover:border-white/40"
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
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
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-slate-900/95 p-6 shadow-2xl ring-1 ring-white/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-red-400"
                >
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Delete Note
                </h3>
                <p className="text-sm text-white/70">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="mb-6 text-white/80">
              Are you sure you want to delete{" "}
              <span className="font-medium text-white">
                "{heading || "this note"}"
              </span>
              ?
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

export default ViewNote;