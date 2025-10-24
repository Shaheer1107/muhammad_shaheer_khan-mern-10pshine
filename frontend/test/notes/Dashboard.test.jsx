import { render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../../src/pages/Dashboard/Dashboard";
import * as notesService from "../../src/services/notesService";
import * as userService from "../../src/services/userService";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../src/services/notesService");
jest.mock("../../src/services/userService");

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe("Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading message initially", async () => {
    renderDashboard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders notes when data loads successfully", async () => {
    userService.getUserData.mockResolvedValue({ name: "Aiza", profileImage: null });
    notesService.getNotes.mockResolvedValue([
      { id: 1, heading: "Note 1", plainText: "Test note 1" },
      { id: 2, heading: "Note 2", plainText: "Test note 2" },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Note 1")).toBeInTheDocument();
      expect(screen.getByText("Note 2")).toBeInTheDocument();
    });
  });

  it("shows error message if fetching fails", async () => {
    userService.getUserData.mockRejectedValueOnce(new Error("User fetch failed"));
    notesService.getNotes.mockRejectedValueOnce(new Error("Notes fetch failed"));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/could not fetch notes/i)).toBeInTheDocument();
    });
  });
});
