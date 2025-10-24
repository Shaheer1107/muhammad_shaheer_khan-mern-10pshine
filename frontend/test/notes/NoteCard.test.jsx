// ✅ test/notes/NoteCard.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NoteCard from "../../src/components/notes/NoteCard";
import * as notesService from "../../src/services/notesService";

// ✅ Mock the notesService to prevent real API calls
jest.mock("../../src/services/notesService");

describe("🧩 NoteCard Component Tests", () => {
  const mockNote = {
    id: 1,
    heading: "Test Note",
    plainText: "This is a sample note",
    updatedAt: "2025-10-24T10:00:00Z",
  };

  test("renders note heading and text", () => {
    console.log("\n🧠 TEST STARTED → renders note heading and text");
    console.log("🧩 Rendering NoteCard with mock note...");

    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>
    );

    console.log("🔍 Checking if heading and text are visible...");
    expect(screen.getByText("Test Note")).toBeInTheDocument();
    console.log("✅ Heading 'Test Note' found!");

    expect(screen.getByText("This is a sample note")).toBeInTheDocument();
    console.log("✅ Note content 'This is a sample note' found!");

    console.log("🎯 NoteCard displayed note details correctly!");
  });

  test("opens delete confirmation modal", () => {
    console.log("\n🧠 TEST STARTED → opens delete confirmation modal");
    console.log("🧩 Rendering NoteCard...");

    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>
    );

    console.log("🖱️ Clicking the delete icon...");
    fireEvent.click(screen.getByTitle("Delete note"));

    console.log("🔍 Checking for 'Delete Note' confirmation modal...");
    expect(screen.getByText(/Delete Note/i)).toBeInTheDocument();
    console.log("✅ Confirmation modal opened successfully!");

    console.log("🎯 Delete modal triggered correctly!");
  });

  test("calls deleteNote on confirm", async () => {
    console.log("\n🧠 TEST STARTED → calls deleteNote on confirm");
    console.log("🧩 Mocking deleteNote API call...");

    notesService.deleteNote.mockResolvedValue({});
    const mockRefresh = jest.fn();

    console.log("🧩 Rendering NoteCard with onRefresh callback...");
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} onRefresh={mockRefresh} />
      </MemoryRouter>
    );

    console.log("🖱️ Simulating delete icon click...");
    fireEvent.click(screen.getByTitle("Delete note"));

    console.log("🖱️ Clicking 'Delete' button in modal...");
    fireEvent.click(screen.getByText("Delete"));

    console.log("🔍 Verifying API call...");
    expect(notesService.deleteNote).toHaveBeenCalledWith(1);
    console.log("✅ deleteNote API was called with note ID = 1");

    console.log("🎯 Note deletion flow executed successfully!");
  });
});
