import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(name, email, password);
      navigate("/login");
    } catch (err) {
  console.error("REGISTER ERROR:", err.response?.data || err);
  setError(JSON.stringify(err.response?.data || err.message));
}

  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-semibold mb-4">Create account</h1>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <label className="block text-sm mb-1">Name</label>
        <input className="w-full border rounded px-3 py-2 mb-3" value={name} onChange={(e) => setName(e.target.value)} required />

        <label className="block text-sm mb-1">Email</label>
        <input className="w-full border rounded px-3 py-2 mb-3" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

        <label className="block text-sm mb-1">Password</label>
        <input className="w-full border rounded px-3 py-2 mb-4" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

        <button className="w-full bg-green-600 text-white rounded py-2 hover:bg-green-700">
          Register
        </button>

        <p className="text-sm mt-4">
          Already have an account? <Link className="text-green-700 underline" to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
