// ChangePassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changeUserPassword } from "../../services/userService";

const ChangePassword = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // generic or server error
  const [fieldError, setFieldError] = useState(""); // validation error

  const MIN_PASSWORD_LENGTH = 8;

  const validate = () => {
    setError("");
    setFieldError("");

    if (!currentPassword.trim()) {
      setFieldError("Please enter your current password.");
      return false;
    }
    if (!newPassword.trim()) {
      setFieldError("Please enter a new password.");
      return false;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFieldError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return false;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("New password and confirmation do not match.");
      return false;
    }
    // (Optional) Add more strength checks here if you want
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setError("");
      await changeUserPassword(currentPassword, newPassword);
      // On success redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Change password failed:", err);
      // Prefer server-provided message when available
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to change password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 relative">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back
      </button>

      {/* Background decorative shapes (kept consistent with your theme) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl translate-x-[-6rem] sm:translate-x-0" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl translate-x-[6rem] sm:translate-x-0" />
      </div>

      <div className="relative z-10 px-4 py-10 sm:px-6 lg:px-8 overflow-y-hidden">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10">
            <h1 className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent leading-[1.2] pb-2">
              Change Password
            </h1>

          </div>

          <div className="rounded-3xl bg-white/5 backdrop-blur-xl p-8 ring-1 ring-white/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {fieldError && (
                <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3">
                  <p className="text-sm text-yellow-200">{fieldError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/60 mb-3">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-3">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                  placeholder="Enter new password"
                  required
                />
                <p className="text-xs text-white/50 mt-2">
                  Minimum {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-3">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Changing Password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="text-sm text-white/60 underline hover:text-white"
                >
                  Back to Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
