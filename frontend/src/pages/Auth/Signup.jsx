import { useState } from "react";
import { signup } from "../../services/authService";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle form input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await signup(formData);
      setSuccess("Signup successful! Redirecting...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-3xl bg-gradient-to-tr from-purple-300/10 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 flex h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Page heading above the signup form */}
        <h1 className="mb-6 bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-center text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl leading-snug pb-1">
          Create your Notes account
        </h1>
        <div className="group w-full max-w-md">
          {/* Card with glassmorphism and gradient border */}
          <div className="relative rounded-3xl p-[1px] shadow-2xl transition-transform duration-300 ease-out group-hover:-translate-y-1">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-fuchsia-400 via-violet-300 to-indigo-300 opacity-40 blur-[6px]" />
            <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/10">
              <div className="px-7 py-8 sm:px-9 sm:py-10">
                <div className="mb-6 flex items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zM2 20a10 10 0 0120 0v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-1z" />
                    </svg>
                  </div>
                  <h2 className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                    Create Account
                  </h2>
                </div>

                {/* Error message */}
                {error && (
                  <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2 text-red-200 shadow-sm">
                    {error}
                  </p>
                )}

                {/* Success message */}
                {success && (
                  <p className="mb-4 rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-violet-100 shadow-sm">
                    {success}
                  </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/95">Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white placeholder-white/60 outline-none transition focus:border-fuchsia-400/70 focus:bg-zinc-800/90 focus:shadow-[0_0_0_3px_rgba(217,70,239,0.12)]"
                      />
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M12 12a5 5 0 100-10 5 5 0 000 10zM2 20a10 10 0 0120 0v1a1 1 0 01-1 1H3a1 1 0 01-1-1v-1z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/95">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white placeholder-white/60 outline-none transition focus:border-violet-400/70 focus:bg-zinc-800/90 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)]"
                      />
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M20 4H4a2 2 0 00-2 2v.35l10 6.25 10-6.25V6a2 2 0 00-2-2zm0 4.15l-8.46 5.29a1 1 0 01-1.08 0L2 8.15V18a2 2 0 002 2h16a2 2 0 002-2V8.15z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/95">Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        name="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-white/20 bg-zinc-800/80 px-4 py-3 text-white placeholder-white/60 outline-none transition focus:border-indigo-400/70 focus:bg-zinc-800/90 focus:shadow-[0_0_0_3px_rgba(129,140,248,0.14)]"
                      />
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M12 5a5 5 0 00-5 5v2H6a2 2 0 00-2 2v5a2 2 0 002 2h12a2 2 0 002-2v-5a2 2 0 00-2-2h-1v-2a5 5 0 00-5-5zm-3 7v-2a3 3 0 116 0v2H9z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition duration-200 ease-out hover:shadow-[0_10px_30px_-10px_rgba(147,51,234,0.55)] focus:outline-none ${
                      loading ? "cursor-not-allowed opacity-70" : ""
                    }`}
                  >
                    <span className="relative z-10">
                      {loading ? "Signing up..." : "Create your account"}
                    </span>
                    <span className="absolute inset-0 -translate-x-full bg-white/20 transition group-hover:translate-x-0" />
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-white/80">
                  Already have an account?{" "}
                  <span
                    onClick={() => navigate("/login")}
                    className="cursor-pointer font-semibold text-fuchsia-300 hover:underline"
                  >
                    Log in
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
