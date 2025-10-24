// test/auth/Signup.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Signup from "../../src/pages/Auth/Signup";
import * as authService from "../../src/services/authService";

// ✅ Proper mock of authService to avoid undefined mock functions
jest.mock("../../src/services/authService", () => ({
  signup: jest.fn(),
}));

// ✅ Utility renderer with BrowserRouter context
const renderSignup = () =>
  render(
    <BrowserRouter>
      <Signup />
    </BrowserRouter>
  );

describe("Signup Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders signup form fields", () => {
    renderSignup();

    expect(
      screen.getByPlaceholderText(/enter your full name/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your email address/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/create a strong password/i)
    ).toBeInTheDocument();
  });

  it("shows success message on successful signup", async () => {
    // ✅ Mock successful API response
    authService.signup.mockResolvedValueOnce({
      accessToken: "token123",
      user: { email: "new@example.com" },
    });

    renderSignup();

    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/create a strong password/i), {
      target: { value: "password" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /create your account/i })
    );

    await waitFor(() => {
      // ✅ Match case-insensitively and handle message fragment
      expect(
        screen.getByText(/signup successful/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error message on failed signup", async () => {
    // ✅ Mock rejected API response with a user-friendly error
    authService.signup.mockRejectedValueOnce({
      response: { data: { message: "Signup failed. Try again." } },
    });

    renderSignup();

    fireEvent.change(screen.getByPlaceholderText(/enter your full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your email address/i), {
      target: { value: "invalid@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/create a strong password/i), {
      target: { value: "123" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /create your account/i })
    );

    await waitFor(() => {
      // ✅ More flexible matcher: checks for any part of "Signup failed"
      expect(
        screen.getByText(/signup failed/i)
      ).toBeInTheDocument();
    });
  });
});
