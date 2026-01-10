import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";

export function useNutritionData(startDate, endDate) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError("");
        
        const res = await api.get("/log", {
          params: { 
            start: startDate.toISOString(), 
            end: endDate.toISOString() 
          },
        });

        setLogs(res.data || []);
      } catch (err) {
        console.error("Error fetching logs:", err);
        setError(err.response?.data?.message || "Failed to load nutrition data");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    if (startDate && endDate) {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [startDate, endDate, refetchTrigger]);

  // Calculate totals
  const totals = logs.reduce((acc, log) => {
    if (log.items && Array.isArray(log.items)) {
      log.items.forEach(item => {
        acc.calories += item.calories || 0;
        acc.sugar += item.sugar || 0;
        acc.protein += item.protein || 0;
        acc.carbs += item.carbs || 0;
        acc.fat += item.fat || 0;
      });
    }
    return acc;
  }, { calories: 0, sugar: 0, protein: 0, carbs: 0, fat: 0 });

  // Round all values
  const roundedTotals = {
    calories: Math.round(totals.calories),
    sugar: Math.round(totals.sugar * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
  };

  return { logs, totals: roundedTotals, loading, error, refetch };
}