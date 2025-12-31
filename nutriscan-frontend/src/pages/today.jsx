import { useAuth } from "../auth/AuthContext";

export default function Today() {
  const { user, logout } = useAuth();
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Today</h1>
      <p className="mt-2">Logged in as: {user?.email || "Unknown"}</p>
      <button className="mt-4 border px-3 py-2 rounded" onClick={logout}>Logout</button>
    </div>
  );
}
