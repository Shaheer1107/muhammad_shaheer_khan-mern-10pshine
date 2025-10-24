// test/notes/NotesList.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom"; // ✅ Required for useNavigate()
import NotesList from "../../src/pages/Dashboard/NotesList"; // ✅ Correct path

// Optionally mock navigation to avoid real redirects
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(), // ✅ Mock navigate
}));

describe("NotesList Component", () => {
  test("renders list of notes", () => {
    const notes = [
      { id: 1, heading: "Note 1", plainText: "Content 1" },
      { id: 2, heading: "Note 2", plainText: "Content 2" },
    ];

    render(
      <MemoryRouter>
        <NotesList notes={notes} />
      </MemoryRouter>
    );

    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.getByText("Note 2")).toBeInTheDocument();
  });

  test("renders empty list without crashing", () => {
    render(
      <MemoryRouter>
        <NotesList notes={[]} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Note/i)).not.toBeInTheDocument();
  });
});
