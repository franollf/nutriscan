import { useMemo, useState, useEffect } from "react";
import { useNutritionData } from "../hooks/useNutritionData";
import api from "../api/axios";

export default function Today() {
  const [deletingItem, setDeletingItem] = useState(null);
  const [previousItems, setPreviousItems] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [addingItem, setAddingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  
  // Load all goals from localStorage
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    sugar: 50,
  });
  
  // Use useMemo to prevent date recalculation on every render
  const dateRange = useMemo(() => {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    return { start: startOfDay, end: endOfDay };
  }, []);

  const { logs, totals, loading, error, refetch } = useNutritionData(dateRange.start, dateRange.end);

  // Load goals from localStorage
  useEffect(() => {
    const savedGoals = localStorage.getItem('calculatedGoals');
    if (savedGoals) {
      const goals = JSON.parse(savedGoals);
      setDailyGoals(goals);
    }
  }, []);

  // Fetch previously added items (last 30 days, excluding today)
  useEffect(() => {
    const fetchPreviousItems = async () => {
      try {
        setLoadingPrevious(true);
        
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        
        const start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        
        const res = await api.get("/log", {
          params: { 
            start: start.toISOString(), 
            end: end.toISOString() 
          },
        });

        const itemsMap = new Map();
        res.data.forEach(log => {
          if (log.items) {
            log.items.forEach(item => {
              if (!itemsMap.has(item.name)) {
                itemsMap.set(item.name, item);
              }
            });
          }
        });

        setPreviousItems(Array.from(itemsMap.values()));
      } catch (err) {
        console.error('Error fetching previous items:', err);
      } finally {
        setLoadingPrevious(false);
      }
    };

    fetchPreviousItems();
  }, []);

  const handleDelete = async (logId, itemIndex) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setDeletingItem(`${logId}-${itemIndex}`);
      await api.delete(`/log/${logId}/item/${itemIndex}`);
      refetch();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert(`Failed to delete item: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleQuickAdd = async (item) => {
    try {
      setAddingItem(item.name);
      
      await api.post("/log", {
        date: new Date(),
        items: [{
          name: item.name,
          calories: item.calories,
          sugar: item.sugar,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          servingSize: item.servingSize || 1,
        }]
      });
      
      refetch();
    } catch (err) {
      console.error('Error adding item:', err);
      alert(`Failed to add item: ${err.response?.data?.error || err.message}`);
    } finally {
      setAddingItem(null);
    }
  };

  const openEditModal = (logId, itemIndex, item) => {
    setEditingItem({ logId, itemIndex, item });
    setServingMultiplier(item.servingSize || 1);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setServingMultiplier(1);
  };

  const handleUpdateServing = async () => {
    if (!editingItem) return;

    try {
      const { logId, itemIndex, item } = editingItem;
      
      const originalServing = item.servingSize || 1;
      
      const updatedItem = {
        name: item.name,
        calories: (item.calories / originalServing) * servingMultiplier,
        sugar: (item.sugar / originalServing) * servingMultiplier,
        protein: (item.protein / originalServing) * servingMultiplier,
        carbs: (item.carbs / originalServing) * servingMultiplier,
        fat: (item.fat / originalServing) * servingMultiplier,
        servingSize: servingMultiplier,
      };

      await api.put(`/log/${logId}/item/${itemIndex}`, updatedItem);
      
      refetch();
      closeEditModal();
    } catch (err) {
      console.error('Error updating serving:', err);
      alert(`Failed to update serving: ${err.response?.data?.message || err.message}`);
    }
  };

  // Calculate progress percentages
  const calorieProgress = Math.min((totals.calories / dailyGoals.calories) * 100, 100);
  const proteinProgress = Math.min((totals.protein / dailyGoals.protein) * 100, 100);
  const carbsProgress = Math.min((totals.carbs / dailyGoals.carbs) * 100, 100);
  const fatProgress = Math.min((totals.fat / dailyGoals.fat) * 100, 100);
  const sugarProgress = Math.min((totals.sugar / dailyGoals.sugar) * 100, 100);
  
  const remaining = Math.max(dailyGoals.calories - totals.calories, 0);

  // SVG circle calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calorieProgress / 100) * circumference;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your nutrition data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <p className="font-semibold mb-2">Error Loading Data</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Today's Nutrition</h1>
          <p className="text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Previously Added Items */}
          <div className="lg:col-span-3">
            {previousItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Quick Add</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{previousItems.length} items</span>
                </div>

                {loadingPrevious ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                    {previousItems.slice(0, 8).map((item, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-sm text-gray-800 dark:text-white truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.round(item.calories || 0)} cal
                          </p>
                        </div>
                        <button
                          onClick={() => handleQuickAdd(item)}
                          disabled={addingItem === item.name}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 opacity-0 group-hover:opacity-100"
                          title="Add to today"
                        >
                          {addingItem === item.name ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-6">
            {/* Calorie Circle and Macros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Circular Progress Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Calorie Goal</h3>
                
                <div className="relative">
                  <svg width="200" height="200" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500 ease-out"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#0d9488" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800 dark:text-white">{totals.calories}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">of {dailyGoals.calories}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{remaining} left</span>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {calorieProgress >= 100 ? '🎉 Goal reached!' : `${Math.round(calorieProgress)}% of daily goal`}
                  </p>
                </div>
              </div>

              {/* Macronutrients Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sugar</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{totals.sugar}g</p>
                  <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${sugarProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Limit: {dailyGoals.sugar}g</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Protein</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totals.protein}g</p>
                  <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${proteinProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Goal: {dailyGoals.protein}g</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Carbs</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totals.carbs}g</p>
                  <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${carbsProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Goal: {dailyGoals.carbs}g</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Fat</p>
                  <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{totals.fat}g</p>
                  <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${fatProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Goal: {dailyGoals.fat}g</p>
                </div>
              </div>
            </div>

            {/* Today's Log Entries */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Today's Meals</h2>

              {logs.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No items logged today</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Start scanning to track your nutrition!</p>
                </div>
              )}

              <div className="space-y-3">
                {logs.map((log) => (
                  log.items && log.items.length > 0 && (
                    <div key={log._id}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2 px-2">
                        {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>

                      {log.items.map((item, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors relative group">
                          {/* Action Buttons */}
                          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(log._id, i, item)}
                              className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors"
                              title="Adjust serving size"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(log._id, i)}
                              disabled={deletingItem === `${log._id}-${i}`}
                              className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete item"
                            >
                              {deletingItem === `${log._id}-${i}` ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>

                          <div className="pr-20">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-gray-800 dark:text-white">{item.name}</p>
                              {item.servingSize && item.servingSize !== 1 && (
                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                  {item.servingSize}x
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">{Math.round(item.calories || 0)}</span> cal
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              P: <span className="font-medium">{Math.round((item.protein || 0) * 10) / 10}g</span>
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              C: <span className="font-medium">{Math.round((item.carbs || 0) * 10) / 10}g</span>
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              F: <span className="font-medium">{Math.round((item.fat || 0) * 10) / 10}g</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Serving Size Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeEditModal}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Adjust Serving Size</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{editingItem.item.name}</p>
              </div>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Serving Multiplier
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setServingMultiplier(Math.max(0.25, servingMultiplier - 0.25))}
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                
                <input
                  type="number"
                  value={servingMultiplier}
                  onChange={(e) => setServingMultiplier(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  step="0.25"
                  min="0.1"
                  className="flex-1 px-4 py-2 text-center text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                
                <button
                  onClick={() => setServingMultiplier(servingMultiplier + 0.25)}
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* Quick select buttons */}
              <div className="flex gap-2 mt-3">
                {[0.5, 1, 1.5, 2].map((value) => (
                  <button
                    key={value}
                    onClick={() => setServingMultiplier(value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      servingMultiplier === value
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {value}x
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3">Updated Nutrition:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-emerald-700 dark:text-emerald-400">Calories</p>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {Math.round((editingItem.item.calories / (editingItem.item.servingSize || 1)) * servingMultiplier)} kcal
                  </p>
                </div>
                <div>
                  <p className="text-emerald-700 dark:text-emerald-400">Protein</p>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {Math.round(((editingItem.item.protein / (editingItem.item.servingSize || 1)) * servingMultiplier) * 10) / 10}g
                  </p>
                </div>
                <div>
                  <p className="text-emerald-700 dark:text-emerald-400">Carbs</p>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {Math.round(((editingItem.item.carbs / (editingItem.item.servingSize || 1)) * servingMultiplier) * 10) / 10}g
                  </p>
                </div>
                <div>
                  <p className="text-emerald-700 dark:text-emerald-400">Fat</p>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {Math.round(((editingItem.item.fat / (editingItem.item.servingSize || 1)) * servingMultiplier) * 10) / 10}g
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateServing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}