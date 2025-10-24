import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NoteCard from "../../src/components/notes/NoteCard";
import * as notesService from "../../src/services/notesService";

jest.mock("../../src/services/notesService");

describe("NoteCard Component", () => {
  const mockNote = {
    id: 1,
    heading: "Test Note",
    plainText: "This is a sample note",
    updatedAt: "2025-10-24T10:00:00Z",
  };

  test("renders note heading and text", () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>
    );

    expect(screen.getByText("Test Note")).toBeInTheDocument();
    expect(screen.getByText("This is a sample note")).toBeInTheDocument();
  });

  test("opens delete confirmation modal", () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle("Delete note"));
    expect(screen.getByText(/Delete Note/i)).toBeInTheDocument();
  });

  test("calls deleteNote on confirm", async () => {
    notesService.deleteNote.mockResolvedValue({});
    const mockRefresh = jest.fn();

    render(
      <MemoryRouter>
        <NoteCard note={mockNote} onRefresh={mockRefresh} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle("Delete note"));
    fireEvent.click(screen.getByText("Delete"));

    expect(notesService.deleteNote).toHaveBeenCalledWith(1);
  });
});
