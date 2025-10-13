import { useState } from "react";
import api from "../../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 flex items-center justify-center px-4">
      <div className="group w-full max-w-md">
        <div className="relative rounded-3xl p-[1px] shadow-2xl">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-fuchsia-400 via-violet-300 to-indigo-300 opacity-40 blur-[6px]" />
          <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/10 p-8">
            <h2 className="mb-5 text-center text-3xl font-extrabold bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-transparent">
              Forgot Password
            </h2>

            {message && (
              <p className="mb-4 rounded-xl border border-green-400/30 bg-green-500/15 px-4 py-2 text-green-100 shadow-sm">
                {message}
              </p>
            )}
            {error && (
              <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2 text-red-200 shadow-sm">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/95">
                  Enter your registered email
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white placeholder-white/60 outline-none focus:border-fuchsia-400/70 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded-xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg hover:shadow-[0_10px_30px_-10px_rgba(147,51,234,0.55)] ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
