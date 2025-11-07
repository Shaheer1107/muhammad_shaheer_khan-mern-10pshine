import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getNote } from "../../services/notesService";
import ViewNote from "../../components/notes/ViewNote";
import EditNote from "../../components/notes/EditNote";

const NoteEditor = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = !id || id === "new";

  const baseURL = "http://localhost:5000";

  const searchParams = new URLSearchParams(location.search);
  const editParam = searchParams.get("edit") === "true";

  const [heading, setHeading] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentJson, setContentJson] = useState({});
  const [plainText, setPlainText] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [isEditing, setIsEditing] = useState(isNew || editParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      getNote(id)
        .then((data) => {
          const note = data.note || data;
          setHeading(note.heading || "");

          const htmlContent = note.contentHtml || "";
          setContentHtml(htmlContent);
          setPlainText(note.plainText || "");

          if (note.contentJson && typeof note.contentJson === "object") {
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
        .catch((err) =>
          setError(err?.response?.data?.message || "Failed to load note.")
        )
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  if (loading) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (isEditing || isNew) {
    return (
      <EditNote
        id={id}
        isNew={isNew}
        heading={heading}
        setHeading={setHeading}
        contentHtml={contentHtml}
        setContentHtml={setContentHtml}
        contentJson={contentJson}
        setContentJson={setContentJson}
        plainText={plainText}
        setPlainText={setPlainText}
        existingImages={existingImages}
        setExistingImages={setExistingImages}
        error={error}
        setError={setError}
      />
    );
  }

  return (
    <ViewNote
      id={id}
      heading={heading}
      contentHtml={contentHtml}
      existingImages={existingImages}
      setIsEditing={setIsEditing}
      error={error}
      setError={setError}
    />
  );
};

export default NoteEditor;