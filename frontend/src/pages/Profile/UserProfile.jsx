import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUserData,
  updateUserProfile,
  uploadProfileImage,
  deleteProfileImage,
} from "../../services/userService";

const UserProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    phone: "",
    dateOfBirth: "",
  });
  const [showModal, setShowModal] = useState(false); // already added previously
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // NEW
  const [deleteLoading, setDeleteLoading] = useState(false); // NEW - disables buttons while request runs

  const API_URL = import.meta.env.VITE_API_URL;
  const BASE_URL = API_URL.replace(/\/api$/, "");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await getUserData();
        setUser(userData);
        setFormData({
          name: userData.name || "",
          bio: userData.bio || "",
          phone: userData.phone || "",
          dateOfBirth: userData.dateOfBirth
            ? userData.dateOfBirth.split("T")[0]
            : "",
        });
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setError(err?.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getProfileImageUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith("http")) return profileImage;
    return `${BASE_URL}/uploads/${profileImage.replace(/^uploads[\\/]/, "")}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Helper to normalize whatever the API returns into a plain user object
  const normalizeUserResponse = (resp) => {
    if (!resp) return null;
    // resp might be the user object itself, or { user: {...} }, or { data: {...} }
    if (resp.user && typeof resp.user === "object") return resp.user;
    if (resp.data && typeof resp.data === "object") return resp.data;
    return resp;
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const raw = await updateUserProfile(formData);

      // Normalize response to a user object and merge with previous to avoid losing fields
      const updated = normalizeUserResponse(raw);
      if (updated) {
        setUser((prev) => ({ ...(prev || {}), ...updated }));
        // keep formData in sync with saved values (useful if backend cleaned/modified any fields)
        setFormData({
          name: (updated.name ?? formData.name) || "",
          bio: (updated.bio ?? formData.bio) || "",
          phone: (updated.phone ?? formData.phone) || "",
          dateOfBirth: updated.dateOfBirth
            ? updated.dateOfBirth.split("T")[0]
            : formData.dateOfBirth || "",
        });
      } else {
        // fallback: if API returned nothing useful, keep previous user intact
        console.warn(
          "updateUserProfile returned no user payload, leaving existing user intact."
        );
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      const raw = await uploadProfileImage(file);

      // uploadProfileImage might return { profileImage: "path" } or { data: { profileImage: "path" } } or { user: {...} }
      let updated = normalizeUserResponse(raw);

      if (updated && updated.profileImage) {
        // If API returned a user object that includes profileImage, merge it
        setUser((prev) => ({ ...(prev || {}), ...updated }));
      } else {
        // If response only contains profileImage (not wrapped), grab it
        const profileImage = raw?.profileImage ?? raw?.data?.profileImage;
        if (profileImage) {
          setUser((prev) => ({ ...(prev || {}), profileImage }));
        } else {
          // As last resort, if backend returned the new file name under some other key, try raw.data or raw
          // but don't overwrite entire user with an unexpected structure.
          console.warn("uploadProfileImage returned unexpected shape:", raw);
        }
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError(err?.response?.data?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      // reset file input so same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user.name || "",
      bio: user.bio || "",
      phone: user.phone || "",
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
    });
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    // simple optimistic update with rollback
    const prevUser = user;
    try {
      setDeleteLoading(true);
      setError("");

      // optimistic: hide image in UI immediately
      setUser((prev) => ({ ...(prev || {}), profileImage: null }));
      // call backend delete
      await deleteProfileImage();

      // success: close confirm modal and keep UI
      setShowDeleteConfirm(false);
    } catch (err) {
      // rollback to previous user on failure
      setUser(prevUser);
      console.error("Failed to delete profile image:", err);
      setError(
        err?.response?.data?.message || "Failed to delete profile picture"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 flex items-center justify-center">
        <div className="text-center">
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
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">No user data found</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const profileImageUrl = getProfileImageUrl(user.profileImage);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-900">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl translate-x-[-6rem] sm:translate-x-0" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl translate-x-[6rem] sm:translate-x-0" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-3xl bg-gradient-to-tr from-purple-300/10 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back to Dashboard
                </button>
                <div>
                  <h1 className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent">
                    Profile
                  </h1>
                  <p className="text-white/60 mt-2">
                    Manage your account settings and preferences
                  </p>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-red-400 flex-shrink-0"
                >
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Image Card */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl bg-white/5 backdrop-blur-xl p-8 ring-1 ring-white/10">
                <div className="text-center">
                  {/* Profile Image / Upload / Delete */}
<div className="relative inline-block">
  {/* Image container (click -> preview) */}
  <div
  onClick={() => profileImageUrl && setShowModal(true)}
  className="h-48 w-48 mx-auto rounded-2xl border-2 border-white/20 bg-white/10 cursor-pointer hover:scale-105 transition-transform duration-300 relative overflow-visible"
>

    {profileImageUrl ? (
      <img
        src={profileImageUrl}
        alt="Profile"
        className="w-full h-full object-contain"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-24 w-24 text-white/40"
        >
          <path d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" />
        </svg>
      </div>
    )}
    {/* Buttons container sits relative to image */}
    <div className="pointer-events-none absolute inset-0 flex items-end justify-between px-3 pb-0">
      {/* Left: Delete (only shown when image exists) */}
      {profileImageUrl ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          aria-label="Delete profile picture"
          title="Delete Profile Picture"
          className="pointer-events-auto z-30 h-12 w-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg transition-transform hover:bg-red-600 disabled:opacity-60 transform translate-y-1/2"
          disabled={deleteLoading}
        >
          {deleteLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="h-5 w-5"
            >
              <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zM7 9v10a2 2 0 002 2h6a2 2 0 002-2V9H7z" />
            </svg>
          )}
        </button>
      ) : (
        <div className="w-12" /> // keep spacing when delete button absent
      )}

      {/* Right: Upload */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        disabled={isUploading}
        aria-label="Upload profile picture"
        className="pointer-events-auto z-30 h-12 w-12 rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-50 transform translate-y-1/2"
      >
        {isUploading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          /* plus icon */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </button>
    </div>
  </div>

  {/* hidden file input */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleImageUpload}
    className="hidden"
  />
</div>

                  <h2 className="text-2xl font-bold text-white mt-6 mb-2">
                    {isEditing ? formData.name : user.name}
                  </h2>
                  <p className="text-white/70 text-lg mb-4">{user.email}</p>

                  <p className="text-sm text-white/60">
                    Click the upload button to change your profile picture
                  </p>
                </div>
              </div>
            </div>

            {/* Image Modal (preview) */}
            {showModal && (
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={() => setShowModal(false)}
              >
                <div
                  className="relative bg-white/10 p-4 rounded-2xl border border-white/20 max-w-lg w-full flex flex-col items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowModal(false)}
                    className="absolute top-2 right-2 text-white/70 hover:text-white"
                    aria-label="Close preview"
                  >
                    ✕
                  </button>
                  <img
                    src={profileImageUrl}
                    alt="Full View"
                    className="rounded-2xl max-h-[80vh] object-contain"
                  />
                </div>
              </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
              <div
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-60"
                // clicking backdrop will close confirm — keeps behavior consistent
                onClick={() => {
                  if (!deleteLoading) setShowDeleteConfirm(false);
                }}
              >
                <div
                  className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full ring-1 ring-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7L5 21M5 7l14 14"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        Confirm delete
                      </h3>
                      <p className="text-sm text-white/70 mt-1">
                        Are you sure you want to delete your profile picture?
                        This action cannot be undone.
                      </p>

                      <div className="mt-6 flex gap-3 justify-end">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deleteLoading}
                          className="rounded-xl border border-white/20 bg-white/5 px-5 py-2 font-semibold text-white/90 backdrop-blur-sm hover:bg-white/10 disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={handleConfirmDelete}
                          disabled={deleteLoading}
                          className="rounded-xl bg-red-500 px-5 py-2 font-semibold text-white shadow-md hover:bg-red-600 disabled:opacity-60 flex items-center gap-2"
                        >
                          {deleteLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            "Delete"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Details Card */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl bg-white/5 backdrop-blur-xl p-8 ring-1 ring-white/10">
                <div className="space-y-8">
                  {/* Basic Information Section */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-white/10">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          Full Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                            placeholder="Enter your full name"
                          />
                        ) : (
                          <p className="text-white text-lg">{user.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          Email Address
                        </label>
                        <p className="text-white/80 text-lg">{user.email}</p>
                        <p className="text-xs text-white/50 mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-white/10">
                      About You
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-3">
                        Bio
                      </label>
                      {isEditing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      ) : (
                        <p className="text-white/80 leading-relaxed text-lg">
                          {user.bio || "No bio provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-white/10">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                            placeholder="+1234567890"
                          />
                        ) : (
                          <p className="text-white/90 text-lg">
                            {user.phone || "Not provided"}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          Date of Birth
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-white/50 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20"
                          />
                        ) : (
                          <p className="text-white/90 text-lg">
                            {formatDate(user.dateOfBirth)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Information Section */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-6 pb-2 border-b border-white/10">
                      Account Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          Member Since
                        </label>
                        <p className="text-white/90 text-lg">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/60 mb-3">
                          Last Updated
                        </label>
                        <p className="text-white/90 text-lg">
                          {formatDate(user.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-8 py-4 font-semibold text-white shadow-lg transition hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.6)] disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving Changes...
                          </div>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/10 hover:border-white/30 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
