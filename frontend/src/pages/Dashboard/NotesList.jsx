import { useState } from "react";
import NoteCard from "../../components/notes/NoteCard";

const NotesList = ({ notes = [], onRefresh }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {notes.map((note, index) => (
        <div
          key={note._id || note.id}
          className="animate-fade-in-up h-64"
          style={{
            animationDelay: `${index * 100}ms`,
            animationFillMode: "both"
          }}
        >
          <NoteCard note={note} onRefresh={onRefresh} />
        </div>
      ))}
    </div>
  );
};

export default NotesList;
