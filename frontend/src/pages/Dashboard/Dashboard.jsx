// src/pages/Dashboard/Dashboard.jsx
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Welcome, User</h1>
      <button
        onClick={logout}
        className="rounded-lg bg-fuchsia-600 px-6 py-3 font-semibold hover:bg-fuchsia-700 transition"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
