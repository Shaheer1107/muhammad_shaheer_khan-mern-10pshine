// ✅ test/notes/Dashboard.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../../src/pages/Dashboard/Dashboard";
import * as notesService from "../../src/services/notesService";
import * as userService from "../../src/services/userService";
import { MemoryRouter } from "react-router-dom";

// ✅ Mock the services to control API behavior
jest.mock("../../src/services/notesService");
jest.mock("../../src/services/userService");

// ✅ Helper to render Dashboard with router context
const renderDashboard = () => {
  console.log("🧩 Rendering <Dashboard /> inside <MemoryRouter>...");
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
};

describe("🧭 Dashboard Page Tests", () => {
  beforeEach(() => {
    console.log("\n🧹 Resetting mocks before next test...\n");
    jest.clearAllMocks();
  });

  it("🟢 Renders loading message initially", async () => {
    console.log("🧠 TEST STARTED → Loading state check");
    console.log("🧩 Rendering Dashboard component...");
    renderDashboard();

    console.log("🔍 Checking for 'Loading' text...");
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    console.log("✅ 'Loading' message displayed successfully!");
  });

  it("🟢 Renders notes when data loads successfully", async () => {
    console.log("\n🧠 TEST STARTED → Successful data load scenario");

    console.log("🧩 Mocking userService.getUserData...");
    userService.getUserData.mockResolvedValue({ name: "Aiza", profileImage: null });

    console.log("🧩 Mocking notesService.getNotes...");
    notesService.getNotes.mockResolvedValue([
      { id: 1, heading: "Note 1", plainText: "Test note 1" },
      { id: 2, heading: "Note 2", plainText: "Test note 2" },
    ]);

    console.log("🧩 Rendering Dashboard...");
    renderDashboard();

    console.log("⏳ Waiting for notes to load...");
    await waitFor(() => {
      expect(screen.getByText("Note 1")).toBeInTheDocument();
      expect(screen.getByText("Note 2")).toBeInTheDocument();
    });

    console.log("✅ Notes rendered successfully after data load!");
  });

  it("🔴 Shows error message if fetching fails", async () => {
    console.log("\n🧠 TEST STARTED → Error handling scenario");

    console.log("🧩 Mocking userService.getUserData to reject...");
    userService.getUserData.mockRejectedValueOnce(new Error("User fetch failed"));

    console.log("🧩 Mocking notesService.getNotes to reject...");
    notesService.getNotes.mockRejectedValueOnce(new Error("Notes fetch failed"));

    console.log("🧩 Rendering Dashboard...");
    renderDashboard();

    console.log("⏳ Waiting for error UI to appear...");
    await waitFor(() => {
      expect(screen.getByText(/could not fetch notes/i)).toBeInTheDocument();
    });

    console.log("✅ Error message displayed successfully for failed fetch!");
  });
});
