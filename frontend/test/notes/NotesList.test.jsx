// ✅ test/notes/NotesList.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotesList from "../../src/pages/Dashboard/NotesList";

// ✅ Mock navigation to avoid actual redirects during tests
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("🧩 NotesList Component Tests", () => {
  test("renders list of notes", () => {
    console.log("\n🧠 TEST STARTED → renders list of notes");

    const notes = [
      { id: 1, heading: "Note 1", plainText: "Content 1" },
      { id: 2, heading: "Note 2", plainText: "Content 2" },
    ];

    console.log("🧩 Rendering NotesList with 2 notes...");
    render(
      <MemoryRouter>
        <NotesList notes={notes} />
      </MemoryRouter>
    );

    console.log("🔍 Checking if 'Note 1' and 'Note 2' are visible...");
    expect(screen.getByText("Note 1")).toBeInTheDocument();
    console.log("✅ Found 'Note 1' successfully!");

    expect(screen.getByText("Note 2")).toBeInTheDocument();
    console.log("✅ Found 'Note 2' successfully!");

    console.log("🎯 NotesList rendered both notes correctly!");
  });

  test("renders empty list without crashing", () => {
    console.log("\n🧠 TEST STARTED → renders empty list without crashing");

    const notes = [];
    console.log("🧩 Rendering NotesList with 0 notes...");
    render(
      <MemoryRouter>
        <NotesList notes={notes} />
      </MemoryRouter>
    );

    console.log("🔍 Checking that no note titles appear...");
    expect(screen.queryByText(/Note/i)).not.toBeInTheDocument();

    console.log("✅ Component handled empty list gracefully!");
  });
});
