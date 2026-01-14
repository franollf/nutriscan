import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import api from "../api/axios";

export default function Scan() {
  const scannerRef = useRef(null);

  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [scanHistory, setScanHistory] = useState([]);
  const [showTips, setShowTips] = useState(false);
  
  // Search functionality
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Recipe suggestions
  const [showRecipes, setShowRecipes] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);

  // Load scan history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('scanHistory') || '[]');
    setScanHistory(history);
  }, []);

  // Save to scan history
  const addToHistory = (productData) => {
    const historyItem = {
      ...productData,
      scannedAt: new Date().toISOString(),
      barcode: barcode,
    };
    
    const newHistory = [historyItem, ...scanHistory.filter(item => item.barcode !== barcode)].slice(0, 10);
    setScanHistory(newHistory);
    localStorage.setItem('scanHistory', JSON.stringify(newHistory));
  };

  useEffect(() => {
    if (!scannerRef.current || !scanning || searchMode) return;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader",
            "code_128_reader",
            "code_39_reader",
          ],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("Quagga init error:", err);
          setError("Camera access failed");
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected(onDetected);

    return () => {
      Quagga.offDetected(onDetected);
      Quagga.stop();
    };
  }, [scanning, searchMode]);

  const onDetected = (data) => {
    const code = data.codeResult.code;
    Quagga.stop();
    setScanning(false);
    setBarcode(code);
    lookupBarcode(code);
  };

  const lookupBarcode = async (code) => {
    setLoading(true);
    setError("");
    setProduct(null);
    setServingMultiplier(1);
    setShowRecipes(false);

    try {
      const res = await api.get(`/product/${code}`);
      console.log("BACKEND RESPONSE:", res.data);

      const p = res.data.product;

      if (!p) {
        throw new Error("Product missing in response");
      }

      const productData = {
        name: p.name, 
        sugar: p.sugar,
        calories: p.calories,
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
      };

      setProduct(productData);
      addToHistory(productData);
    } catch (err) {
      console.error("LOOKUP ERROR:", err);
      setError("Product not found. Try manual entry or report this barcode.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to detect if result looks correct
  const isLikelyCorrectResult = (result, query) => {
    if (!result || !result.name) return false;
    
    const name = result.name.toLowerCase();
    const q = query.toLowerCase().trim();
    
    // Exact match or starts with query
    if (name === q || name.startsWith(q + ' ') || name.startsWith(q + ',')) {
      return true;
    }
    
    // Single word query should match simple results
    if (!query.includes(' ')) {
      const firstWord = name.split(/[\s,]/)[0];
      return firstWord === q;
    }
    
    return false;
  };

  // Enhanced search with intelligent ranking
  const searchFood = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // First, get results from enhanced backend search
      const res = await api.get(`/product/search`, {
        params: { query: query.trim() }
      });
      
      let results = res.data.results || [];
      
      // Optional: If first result doesn't look right, use AI to re-rank
      if (results.length > 5 && !isLikelyCorrectResult(results[0], query)) {
        console.log('🤖 Using AI to improve ranking...');
        
        try {
          const aiRes = await api.post('/ai/rank-search-results', {
            query: query.trim(),
            results: results.slice(0, 10)
          });
          
          results = [...aiRes.data.results, ...results.slice(10)];
        } catch (aiError) {
          console.warn('AI ranking failed, using default results');
        }
      }
      
      setSearchResults(results);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error("SEARCH ERROR:", err);
      setError("Search failed. Please try again.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    if (!searchMode) return;
    
    const timer = setTimeout(() => {
      searchFood(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const selectSearchResult = (result) => {
    const productData = {
      name: result.name,
      sugar: result.sugar,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
    };
    
    setProduct(productData);
    setSearchResults([]);
    setSearchQuery("");
    setBarcode(result.barcode || "");
    setShowRecipes(false);
    setError(''); // Clear any errors
  };

  // Fetch recipe suggestions using Gemini AI
  const fetchRecipes = async (foodName) => {
    setRecipesLoading(true);
    setShowRecipes(true);
    setRecipes([]); // Clear previous recipes
    
    try {
      // Extract main ingredient (remove brand names, etc.)
      const ingredient = foodName.split('-')[0].trim().split(',')[0].trim();
      
      console.log('🔍 Requesting recipes for:', ingredient);
      
      const res = await api.post('/ai/generate-recipes', {
        ingredient: ingredient
      });
      
      console.log('✅ Recipe response:', res.data);
      
      const generatedRecipes = res.data.recipes || [];
      
      if (generatedRecipes.length === 0) {
        console.warn('⚠️ No recipes returned from API');
        setError('No recipes could be generated. Try a different ingredient.');
        setRecipes([]);
        return;
      }
      
      // Transform recipes to include Google search links
      const recipesWithLinks = generatedRecipes.map(recipe => ({
        ...recipe,
        searchUrl: `https://www.google.com/search?q=${encodeURIComponent(recipe.title + ' recipe')}`,
        id: Math.random().toString(36).substr(2, 9)
      }));
      
      console.log('✅ Recipes with links:', recipesWithLinks);
      setRecipes(recipesWithLinks);
      setError(''); // Clear any previous errors
      
    } catch (err) {
      console.error('❌ Error fetching recipes from Gemini:', err);
      console.error('Error response:', err.response?.data);
      
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to generate recipe ideas. Please try again.';
      setError(errorMessage);
      setRecipes([]);
    } finally {
      setRecipesLoading(false);
    }
  };

  const addToToday = async () => {
    if (!product) return;

    try {
      await api.post("/log", {
        date: new Date(),
        items: [
          {
            name: product.name,
            sugar: product.sugar * servingMultiplier,
            calories: product.calories * servingMultiplier,
            protein: product.protein * servingMultiplier,
            carbs: product.carbs * servingMultiplier,
            fat: product.fat * servingMultiplier,
            servingSize: servingMultiplier,
          },
        ],
      });

      alert("Added to Today!");
      resetScan();
    } catch (err) {
      console.error("LOG ERROR FULL:", err);
      console.error("LOG ERROR RESPONSE:", err?.response);
      alert("Failed to add log");
    }
  };

  const resetScan = () => {
    setBarcode("");
    setProduct(null);
    setError("");
    setServingMultiplier(1);
    setScanning(true);
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
    setShowRecipes(false);
    setRecipes([]);
  };

  const toggleMode = () => {
    setSearchMode(!searchMode);
    setScanning(!searchMode ? false : true);
    setProduct(null);
    setError("");
    setSearchQuery("");
    setSearchResults([]);
    setShowRecipes(false);
    setRecipes([]);
  };

  const getAdjustedValue = (value) => {
    return Math.round((value * servingMultiplier) * 10) / 10;
  };

  const quickAddFromHistory = async (historyItem) => {
    try {
      await api.post("/log", {
        date: new Date(),
        items: [
          {
            name: historyItem.name,
            sugar: historyItem.sugar,
            calories: historyItem.calories,
            protein: historyItem.protein,
            carbs: historyItem.carbs,
            fat: historyItem.fat,
            servingSize: 1,
          },
        ],
      });
      alert("Added to Today!");
    } catch (err) {
      console.error("Error adding from history:", err);
      alert("Failed to add item");
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear all scan history?')) {
      setScanHistory([]);
      localStorage.removeItem('scanHistory');
    }
  };

  // Calculate nutrition score
  const getNutritionScore = (product) => {
    if (!product) return null;
    
    let score = 100;
    
    // Penalize high sugar (>10g is concerning)
    if (product.sugar > 10) score -= Math.min(30, (product.sugar - 10) * 2);
    
    // Reward high protein (>10g is good)
    if (product.protein > 10) score += Math.min(20, (product.protein - 10));
    
    // Penalize high calories (>300 is concerning)
    if (product.calories > 300) score -= Math.min(20, (product.calories - 300) / 10);
    
    // Penalize high fat (>15g is concerning)
    if (product.fat > 15) score -= Math.min(15, (product.fat - 15));
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400';
      case 'hard':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
    }
  };

  const nutritionScore = product ? getNutritionScore(product) : null;

  return (
    <div className="p-6 pb-20 md:pb-6">
      <div className="max-w-2xl mx-auto">
        {/* Header with Stats */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              {searchMode ? 'Search Food' : 'Scan Barcode'}
            </h1>
            <button
              onClick={() => setShowTips(!showTips)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Scanning tips"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {searchMode 
              ? 'Search for food by name to get nutritional information'
              : 'Point your camera at a product barcode to get nutritional information'}
          </p>
          
          {/* Mode Toggle */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={toggleMode}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                !searchMode
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan Barcode
            </button>
            <button
              onClick={toggleMode}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                searchMode
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Food
            </button>
          </div>
          
          {scanHistory.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{scanHistory.length} items in scan history</span>
            </div>
          )}
        </div>

        {/* Search Mode */}
        {searchMode && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 transition-colors">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for food (e.g., 'apple', 'chicken breast', 'coca cola')"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <svg className="w-6 h-6 absolute left-4 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Search Results */}
            {searchLoading && (
              <div className="mt-4 text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Searching...</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => selectSearchResult(result)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <p className="font-medium text-gray-800 dark:text-white">{result.name}</p>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span>{Math.round(result.calories || 0)} cal</span>
                      <span>•</span>
                      <span>P: {Math.round((result.protein || 0) * 10) / 10}g</span>
                      <span>•</span>
                      <span>C: {Math.round((result.carbs || 0) * 10) / 10}g</span>
                      <span>•</span>
                      <span>F: {Math.round((result.fat || 0) * 10) / 10}g</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="mt-4 text-center py-8">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">No results found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Scanning Tips */}
        {showTips && !searchMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Scanning Tips
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Hold your phone steady and about 6 inches from the barcode</li>
              <li>• Make sure the barcode is well-lit</li>
              <li>• Avoid shadows and glare on the barcode</li>
              <li>• Keep the barcode flat and fully visible</li>
              <li>• Try different angles if it's not scanning</li>
            </ul>
          </div>
        )}

        {/* Camera Scanner */}
        {scanning && !searchMode && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 mb-6 transition-colors">
            <div className="relative w-full h-80 rounded-xl overflow-hidden bg-gray-900">
              <div
                ref={scannerRef}
                className="w-full h-full"
              />
              
              {/* Scanning Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-72 h-44">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                  
                  {/* Scanning line */}
                  <div className="absolute inset-x-0 top-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/50 animate-pulse" />
                  
                  {/* Barcode icon */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white opacity-30">
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2 6h2v12H2V6zm3 0h1v12H5V6zm2 0h3v12H7V6zm4 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h2v12h-2V6zm3 0h3v12h-3V6z"/>
                    </svg>
                  </div>
                </div>
                
                {/* Instruction */}
                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <div className="inline-block bg-black bg-opacity-70 px-4 py-2 rounded-full">
                    <p className="text-white text-sm font-medium">Position barcode in center</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-3">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hold steady for best results
              </p>
            </div>
          </div>
        )}

        {/* Barcode Detected */}
        {barcode && !searchMode && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              <span className="font-semibold">Detected barcode:</span> {barcode}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center mb-6 transition-colors">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Looking up product...</p>
          </div>
        )}

        {/* Error State with Report Option */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-400 mb-3">{error}</p>
            {barcode && (
              <button
                onClick={() => alert('Report functionality coming soon! Barcode: ' + barcode)}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                → Report missing product
              </button>
            )}
          </div>
        )}

        {/* Product Information with Nutrition Score and Recipes */}
        {product && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex-1">{product.name}</h2>
                
                {/* Nutrition Score Badge */}
                {nutritionScore !== null && (
                  <div className="ml-4 flex flex-col items-center">
                    <div className={`text-3xl font-bold ${getScoreColor(nutritionScore)}`}>
                      {nutritionScore}
                    </div>
                    <div className={`text-xs font-medium ${getScoreColor(nutritionScore)}`}>
                      {getScoreLabel(nutritionScore)}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Serving Size Adjuster */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Serving Size
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setServingMultiplier(Math.max(0.25, servingMultiplier - 0.25))}
                    className="p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {value}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition Values */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">Calories</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round(getAdjustedValue(product.calories ?? 0))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">kcal</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">Sugar</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {getAdjustedValue(product.sugar ?? 0)}g
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Protein</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {getAdjustedValue(product.protein ?? 0)}g
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Carbs</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {getAdjustedValue(product.carbs ?? 0)}g
                  </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg">
                  <p className="text-sm text-rose-700 dark:text-rose-400 mb-1">Fat</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    {getAdjustedValue(product.fat ?? 0)}g
                  </p>
                </div>
              </div>

              {servingMultiplier !== 1 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400 text-center">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Nutrition values adjusted for {servingMultiplier}x serving size
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={addToToday}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg"
                >
                  Add to Today
                </button>
                
                <button
                  onClick={() => fetchRecipes(product.name)}
                  disabled={recipesLoading}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-lg font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {recipesLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Loading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="hidden sm:inline">Recipes</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Recipe Suggestions from Gemini AI */}
            {showRecipes && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                      Recipe Ideas with {product.name.split('-')[0].split(',')[0].trim()}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowRecipes(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {recipesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Generating recipe ideas with AI...</p>
                  </div>
                ) : recipes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recipes.map((recipe) => (
                      <a
                        key={recipe.id}
                        href={recipe.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-700 dark:to-purple-900/20 rounded-lg p-5 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-gray-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex-1 pr-2">
                            {recipe.title}
                          </h4>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                        
                        {recipe.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                            {recipe.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          {recipe.difficulty && (
                            <span className={`px-2 py-1 rounded-full font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                              {recipe.difficulty}
                            </span>
                          )}
                          
                          {recipe.cookTime && (
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {recipe.cookTime}
                            </span>
                          )}
                          
                          {recipe.servings && (
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {recipe.servings}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Click to search full recipe on Google
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No recipes generated</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try again</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && !scanning && !searchMode && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Scans</h3>
              <button
                onClick={clearHistory}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scanHistory.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-white truncate">{item.name}</p>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{Math.round(item.calories || 0)} cal</span>
                      <span>{Math.round((item.protein || 0) * 10) / 10}g protein</span>
                      <span className="text-gray-400">•</span>
                      <span>{new Date(item.scannedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => quickAddFromHistory(item)}
                    className="ml-3 p-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg transition-colors flex-shrink-0"
                    title="Add to today"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Entry */}
        {!searchMode && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Manual Entry</h3>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter barcode manually</label>
            <div className="flex gap-3">
              <input
                className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Enter barcode number"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
              <button
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg"
                onClick={() => lookupBarcode(barcode)}
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* Reset Button */}
        {!scanning && !searchMode && (
          <button
            className="w-full text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition"
            onClick={resetScan}
          >
            ← Scan another item
          </button>
        )}
      </div>
    </div>
  );
}