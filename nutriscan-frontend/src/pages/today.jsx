import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Today() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchToday = async () => {
      try {
        setLoading(true);

        const today = new Date();
        const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const res = await api.get("/log", {
          params: { start, end },
        });

        setLogs(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load today's logs");
      } finally {
        setLoading(false);
      }
    };

    fetchToday();
  }, []);

  if (loading) return <p className="p-6">Loading…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Today</h1>

      {logs.length === 0 && (
        <p className="text-gray-600">No items logged today.</p>
      )}

      {logs.map((log) => (
  log.items.length > 0 && (
    <div key={log._id} className="border rounded p-4 mb-3">
      <p className="text-sm text-gray-500">
        {new Date(log.createdAt).toLocaleTimeString()}
      </p>

      {log.items.map((item, i) => (
        <div key={i} className="mt-2">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-gray-600">
            {item.calories} kcal | Sugar: {item.sugar}g Protein : {item.protein}g | 
            Carbohydrates: {item.carbs}g 
            | Fat: {item.fat}g
          </p>
        </div>
      ))}
    </div>
  )
))}

    </div>
  );
}
