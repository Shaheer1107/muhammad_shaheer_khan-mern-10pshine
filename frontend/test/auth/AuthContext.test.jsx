// test/auth/AuthContext.test.jsx
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../src/context/AuthContext";
import * as authService from "../../src/services/authService";

// ✅ Properly mock the entire authService module
jest.mock("../../src/services/authService", () => ({
  login: jest.fn(),
  logout: jest.fn(),
  signup: jest.fn(),
}));

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("should login and store token", async () => {
    const mockUser = { id: 1, email: "test@example.com" };
    const mockToken = "abc123";

    // ✅ Mock login to resolve successfully
    authService.login.mockResolvedValueOnce({
      accessToken: mockToken,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ email: "test@example.com", password: "123456" });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem("token")).toBe(mockToken);
  });

  it("should logout and clear token", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
