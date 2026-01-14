import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Meals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);

  // Create/Edit meal form
  const [mealName, setMealName] = useState("");
  const [mealDescription, setMealDescription] = useState("");
  const [mealItems, setMealItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const res = await api.get('/meals');
      setMeals(res.data.meals || []);
    } catch (err) {
      console.error('Error fetching meals:', err);
    } finally {
      setLoading(false);
    }
  };

 const searchFood = async (query) => {
  if (!query || query.trim().length < 2) {
    setSearchResults([]);
    return;
  }

  console.log('🔍 Meals: Starting search for:', query); // Debug

  setSearchLoading(true);
  try {
    const res = await api.get(`/product/search`, {
      params: { query: query.trim() }
    });
    
    console.log('✅ Meals: Search response:', res.data); // Debug
    console.log('✅ Meals: Results count:', res.data.results?.length); // Debug
    
    setSearchResults(res.data.results || []);
  } catch (err) {
    console.error("❌ Meals: Search error:", err);
    console.error("❌ Error response:", err.response?.data); // Debug
    console.error("❌ Error status:", err.response?.status); // Debug
  } finally {
    setSearchLoading(false);
  }
};

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchFood(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addItemToMeal = (item) => {
    const newItem = {
      name: item.name,
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      sugar: item.sugar || 0,
      fat: item.fat || 0,
      servingSize: 1,
    };
    setMealItems([...mealItems, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeItemFromMeal = (index) => {
    setMealItems(mealItems.filter((_, i) => i !== index));
  };

  const updateItemServing = (index, servingSize) => {
    const updated = [...mealItems];
    updated[index].servingSize = Math.max(0.1, parseFloat(servingSize) || 0.1);
    setMealItems(updated);
  };

  const calculateMealTotals = () => {
    return mealItems.reduce((totals, item) => ({
      calories: totals.calories + (item.calories * item.servingSize),
      protein: totals.protein + (item.protein * item.servingSize),
      carbs: totals.carbs + (item.carbs * item.servingSize),
      sugar: totals.sugar + (item.sugar * item.servingSize),
      fat: totals.fat + (item.fat * item.servingSize),
    }), { calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0 });
  };

  const saveMeal = async () => {
  if (!mealName.trim()) {
    alert("Please enter a meal name");
    return;
  }

  if (mealItems.length === 0) {
    alert("Please add at least one item to the meal");
    return;
  }

  try {
    const mealData = {
      name: mealName,
      description: mealDescription,
      items: mealItems,
    };

    console.log('Saving meal:', mealData); // Debug log

    if (editingMeal) {
      const res = await api.put(`/meals/${editingMeal._id}`, mealData);
      console.log('Update response:', res.data);
      alert("Meal updated!");
    } else {
      const res = await api.post('/meals', mealData);
      console.log('Create response:', res.data);
      alert("Meal saved!");
    }

    closeModal();
    fetchMeals();
  } catch (err) {
    console.error('Error saving meal:', err);
    console.error('Error response:', err.response?.data);
    console.error('Error status:', err.response?.status);
    
    const errorMessage = err.response?.data?.error || err.message || 'Failed to save meal';
    alert(`Failed to save meal: ${errorMessage}`);
  }
};

  const deleteMeal = async (mealId) => {
    if (!window.confirm('Delete this meal?')) return;

    try {
      await api.delete(`/meals/${mealId}`);
      alert("Meal deleted!");
      fetchMeals();
    } catch (err) {
      console.error('Error deleting meal:', err);
      alert("Failed to delete meal");
    }
  };

  const addMealToToday = async (meal) => {
    try {
      await api.post("/log", {
        date: new Date(),
        items: meal.items,
      });
      alert(`"${meal.name}" added to today!`);
    } catch (err) {
      console.error('Error adding meal to log:', err);
      alert("Failed to add meal to today");
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setEditingMeal(null);
    setMealName("");
    setMealDescription("");
    setMealItems([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const openEditModal = (meal) => {
    setShowCreateModal(true);
    setEditingMeal(meal);
    setMealName(meal.name);
    setMealDescription(meal.description || "");
    setMealItems(meal.items);
    setSearchQuery("");
    setSearchResults([]);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingMeal(null);
    setMealName("");
    setMealDescription("");
    setMealItems([]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const totals = calculateMealTotals();

  return (
    <div className="p-6 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Meals</h1>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Meal
            </button>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Create and save your favorite meals for quick logging
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading meals...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && meals.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No meals yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first meal to get started</p>
            <button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition"
            >
              Create Your First Meal
            </button>
          </div>
        )}

        {/* Meals List */}
        {!loading && meals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meals.map((meal) => {
              const mealTotals = meal.items.reduce((totals, item) => ({
                calories: totals.calories + (item.calories * item.servingSize),
                protein: totals.protein + (item.protein * item.servingSize),
                carbs: totals.carbs + (item.carbs * item.servingSize),
                sugar: totals.sugar + (item.sugar * item.servingSize),
                fat: totals.fat + (item.fat * item.servingSize),
              }), { calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0 });

              return (
                <div
                  key={meal._id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                        {meal.name}
                      </h3>
                      {meal.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {meal.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(meal)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                        title="Edit meal"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMeal(meal._id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                        title="Delete meal"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
                    {meal.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="flex-1">
                          {item.name}
                          {item.servingSize !== 1 && ` (${item.servingSize}x)`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Nutrition Summary */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Calories</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round(mealTotals.calories)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Protein</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {Math.round(mealTotals.protein)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {Math.round(mealTotals.carbs)}g
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add to Today Button */}
                  <button
                    onClick={() => addMealToToday(meal)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg"
                  >
                    Add to Today
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Meal Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {editingMeal ? 'Edit Meal' : 'Create New Meal'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Meal Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meal Name *
                  </label>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g., Breakfast Bowl, Post-Workout Shake"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Meal Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={mealDescription}
                    onChange={(e) => setMealDescription(e.target.value)}
                    placeholder="e.g., My usual morning meal"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Search for Items */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Items
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for food to add..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <svg className="w-6 h-6 absolute left-4 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Search Results */}
                  {searchLoading && (
                    <div className="mt-2 text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => addItemToMeal(result)}
                          className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-800 dark:text-white">{result.name}</span>
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meal Items */}
                {mealItems.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Meal Items ({mealItems.length})
                    </label>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {mealItems.map((item, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {Math.round(item.calories * item.servingSize)} cal • 
                                P: {Math.round(item.protein * item.servingSize * 10) / 10}g • 
                                C: {Math.round(item.carbs * item.servingSize * 10) / 10}g
                              </p>
                            </div>
                            <button
                              onClick={() => removeItemFromMeal(index)}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">Servings:</label>
                            <input
                              type="number"
                              value={item.servingSize}
                              onChange={(e) => updateItemServing(index, e.target.value)}
                              step="0.25"
                              min="0.1"
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meal Totals */}
                {mealItems.length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Meal Totals</p>
                    <div className="grid grid-cols-5 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Calories</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round(totals.calories)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Protein</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {Math.round(totals.protein)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {Math.round(totals.carbs)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Sugar</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                          {Math.round(totals.sugar)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Fat</p>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                          {Math.round(totals.fat)}g
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveMeal}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg"
                  >
                    {editingMeal ? 'Update Meal' : 'Save Meal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}