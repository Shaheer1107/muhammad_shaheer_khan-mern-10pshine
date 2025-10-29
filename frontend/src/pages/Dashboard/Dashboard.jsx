import { useEffect, useState, useRef } from "react";
import { getNotes } from "../../services/notesService";
import { getUserData } from "../../services/userService";
import NotesList from "./NotesList";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // --- Search / Filter / Sort States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // --- Date Range for Custom Filter ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [user, setUser] = useState({
    name: "Loading...",
    profileImage: null,
  });

let API_URL;

try {
  // Works in Vite or browser
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    API_URL = import.meta.env.VITE_API_URL;
  } else if (typeof process !== "undefined" && process.env.VITE_API_URL) {
    // Works in Jest or Node
    API_URL = process.env.VITE_API_URL;
  } else {
    API_URL = "http://localhost:5000/api";
  }
} catch {
  API_URL = process.env.VITE_API_URL || "http://localhost:5000/api";
}

  const BASE_URL = API_URL.replace(/\/api$/, "");

  // --- Fetch User Data ---
  const fetchUserData = async () => {
    try {
      const userData = await getUserData();
      setUser(userData);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setUser({
        name: "User",
        profileImage: null,
      });
    }
  };

  // --- Fetch Notes ---
  const fetchNotes = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        q: searchQuery || undefined,
        filterType:
          filterType !== "all" && filterType !== "custom"
            ? filterType
            : undefined,
        sortBy,
        sortOrder,
        startDate: filterType === "custom" && startDate ? startDate : undefined,
        endDate: filterType === "custom" && endDate ? endDate : undefined,
      };

      const data = await getNotes(params);
      const notesArray = Array.isArray(data)
        ? data
        : Array.isArray(data.notes)
        ? data.notes
        : [];
      setNotes(notesArray);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      setError(
        err?.response?.data?.message ||
          "Could not fetch notes. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // --- Handle Outside Click for Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [searchQuery, filterType, sortBy, sortOrder, startDate, endDate]);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden box-border bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl translate-x-[-6rem] sm:translate-x-0" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl translate-x-[6rem] sm:translate-x-0" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-3xl bg-gradient-to-tr from-purple-300/10 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <h1 className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent">
                  Your Notes
                </h1>
                <p className="text-sm sm:text-base text-white/70">
                  Organize your thoughts beautifully
                </p>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3 absolute top-4 right-6 z-50 flex-wrap sm:flex-nowrap">
                {/* ➕ New Note Button */}
                <button
                  onClick={() => navigate("/notes/new")}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-4 py-2 sm:px-6 sm:py-3 font-semibold text-white shadow-lg transition duration-200 ease-out hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)] focus:outline-none flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 flex-shrink-0"
                  >
                    <path d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="hidden xs:inline sm:inline">New Note</span>
                  <span className="absolute inset-0 -translate-x-full bg-white/20 transition group-hover:translate-x-0" />
                </button>

                {/* 🔄 Refresh Button */}
                <button
                  onClick={fetchNotes}
                  className="rounded-xl border border-white/20 bg-white/5 p-2.5 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
                  title="Refresh notes"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* 👤 Avatar Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown((prev) => !prev)}
                    className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/20 overflow-hidden bg-white/10 hover:bg-white/20 transition"
                  >
                    {user.profileImage ? (
                      <img
                        src={
                          user.profileImage.startsWith("http")
                            ? user.profileImage
                            : `${BASE_URL}/uploads/${user.profileImage.replace(
                                /^uploads[\\/]/,
                                ""
                              )}`
                        }
                        alt="User Avatar"
                        className="w-full h-full object-contain bg-black/10 rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white text-xl font-semibold rounded-full">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-44 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-white/90 z-20">
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/profile");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/20 rounded-t-xl transition"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          navigate("/change_password");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/20 transition"
                      >
                        Change Password
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 hover:bg-red-500/30 text-red-300 rounded-b-xl transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🔍 Search, Filter, Sort Controls */}
            <div className="flex flex-wrap gap-3 items-center bg-white/5 p-3 rounded-xl backdrop-blur-lg border border-white/10">
              {/* Search */}
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              />

              {/* Filter Dropdown */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none"
              >
                <option className="text-black" value="all">
                  All Notes
                </option>
                <option className="text-black" value="today">
                  Today
                </option>
                <option className="text-black" value="yesterday">
                  Yesterday
                </option>
                <option className="text-black" value="last_week">
                  Last Week
                </option>
                <option className="text-black" value="last_month">
                  Last Month
                </option>
                <option className="text-black" value="custom">
                  Custom Range
                </option>
              </select>

              {/* Custom Date Range Fields */}
              {filterType === "custom" && (
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none"
                  />
                  <span className="text-white/70">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none"
                  />
                </div>
              )}

              {/* Sort Fields */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none"
              >
                <option className="text-black" value="updatedAt">
                  Updated Date
                </option>
                <option className="text-black" value="createdAt">
                  Created Date
                </option>
                <option className="text-black" value="heading">
                  Heading
                </option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 focus:outline-none"
              >
                <option className="text-black" value="desc">
                  Descending
                </option>
                <option className="text-black" value="asc">
                  Ascending
                </option>
              </select>
            </div>
          </div>

          {/* Notes Content */}
          <div className="rounded-3xl bg-white/5 backdrop-blur-xl p-4 sm:p-6 ring-1 ring-white/10">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-white/70">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
                  <span>Loading your notes...</span>
                </div>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6 text-red-400"
                  >
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-red-300">{error}</p>
              </div>
            ) : notes.length === 0 ? (
              searchQuery || filterType !== "all" ? (
                // 🟣 No Notes Found (Search or Filter)
                <div className="py-16 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-10 w-10 text-fuchsia-400"
                    >
                      <path d="M10.5 3a7.5 7.5 0 015.86 12.147l4.146 4.147a.75.75 0 11-1.06 1.06l-4.147-4.146A7.5 7.5 0 1110.5 3zm0 1.5a6 6 0 100 12 6 6 0 000-12z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    No notes found
                  </h3>
                  <p className="text-white/70">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              ) : (
                // 🟣 No Notes Yet (First-time user)
                <div className="py-16 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-10 w-10 text-fuchsia-400"
                    >
                      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    No notes yet
                  </h3>
                  <p className="mb-6 text-white/70">
                    Start creating your first note to get organized
                  </p>
                  <button
                    onClick={() => navigate("/notes/new")}
                    className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)]"
                  >
                    Create Your First Note
                  </button>
                </div>
              )
            ) : (
              <NotesList notes={notes} onRefresh={fetchNotes} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
