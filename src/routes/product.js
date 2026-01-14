const express = require("express");
const axios = require("axios");
const Product = require("../models/Product");
const router = express.Router();

// ==========================================
// USDA FoodData Central Search
// ==========================================
async function searchFoodDatabaseUSDA(query) {
  const USDA_API_KEY = process.env.USDA_API_KEY;
  
  if (!USDA_API_KEY) {
    console.error('⚠️ USDA_API_KEY not set in .env file');
    throw new Error('USDA API key not configured');
  }
  
  console.log('🔍 Searching USDA for:', query);
  
  try {
    const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        api_key: USDA_API_KEY,
        query: query,
        pageSize: 25,
        dataType: ['Foundation', 'Survey (FNDDS)', 'SR Legacy', 'Branded']
      },
      timeout: 15000
    });

    if (!response.data?.foods) {
      console.log('⚠️ USDA: No foods in response');
      return [];
    }

    console.log('📊 USDA found:', response.data.foods.length, 'foods');

    return response.data.foods
      .filter(food => food.description)
      .map(food => {
        const nutrients = food.foodNutrients || [];
        
        // Find nutrient by ID (most reliable)
        const getById = (id) => {
          const n = nutrients.find(n => n.nutrientId === id);
          return n ? n.value : 0;
        };

        // USDA Nutrient IDs:
        // 1008 = Energy (kcal)
        // 1003 = Protein
        // 1004 = Total Fat
        // 1005 = Carbohydrates
        // 2000 = Sugars, total
        const calories = getById(1008);
        const protein = getById(1003);
        const fat = getById(1004);
        const carbs = getById(1005);
        const sugar = getById(2000) || getById(1063);

        return {
          name: food.description,
          barcode: food.gtinUpc || `usda-${food.fdcId}`,
          brand: food.brandName || food.brandOwner || '',
          calories: Math.round(calories),
          protein: Math.round(protein * 10) / 10,
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          sugar: Math.round(sugar * 10) / 10,
          source: 'usda'
        };
      })
      .slice(0, 15);

  } catch (error) {
    console.error('❌ USDA API Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data).substring(0, 200));
    }
    
    throw error;
  }
}

// ==========================================
// Open Food Facts Search
// ==========================================
async function searchFoodDatabaseOpenFood(query) {
  console.log('🔍 Searching Open Food Facts for:', query);
  
  try {
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 20,
        fields: 'product_name,nutriments,code,brands'
      },
      timeout: 20000,
      headers: {
        'User-Agent': 'NutritionApp/1.0'
      }
    });

    if (!response.data?.products) {
      console.log('⚠️ OFF: No products in response');
      return [];
    }

    console.log('📊 OFF found:', response.data.products.length, 'products');

    return response.data.products
      .filter(p => p.product_name)
      .map(p => {
        const n = p.nutriments || {};
        
        return {
          name: p.brands ? `${p.product_name} - ${p.brands}` : p.product_name,
          barcode: p.code || '',
          brand: p.brands || '',
          calories: Math.round(n['energy-kcal_100g'] || (n.energy_100g || 0) / 4.184),
          protein: Math.round((n.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((n.fat_100g || 0) * 10) / 10,
          sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
          source: 'openfoodfacts'
        };
      })
      .slice(0, 15);

  } catch (error) {
    console.error('❌ OFF Error:', error.message);
    throw error;
  }
}

// ==========================================
// Search Ranking Algorithm
// ==========================================
function rankSearchResults(results, searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  const words = term.split(/\s+/);
  
  return results
    .map(result => {
      const name = result.name.toLowerCase();
      let score = 0;
      
      if (name === term) score += 1000;
      if (name.startsWith(term)) score += 500;
      if (words.length === 1 && name.split(/[\s,]/)[0] === term) score += 400;
      if (name.includes(term)) score += 300;
      if (words.length === 1) score += Math.max(0, 50 - name.length);
      if (result.source === 'usda') score += 50;

      return { ...result, searchScore: score };
    })
    .sort((a, b) => b.searchScore - a.searchScore);
}

// ==========================================
// ROUTES
// ==========================================

// Test USDA API - PUT THIS FIRST
router.get('/test-usda', async (req, res) => {
  const USDA_API_KEY = process.env.USDA_API_KEY;
  
  console.log('\n🧪 === USDA API TEST ===');
  console.log('API Key exists:', !!USDA_API_KEY);
  console.log('API Key length:', USDA_API_KEY?.length);
  
  if (!USDA_API_KEY) {
    return res.json({
      success: false,
      error: 'USDA_API_KEY not found in environment variables',
      hint: 'Add USDA_API_KEY=your_key_here to your .env file'
    });
  }
  
  try {
    const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        api_key: USDA_API_KEY,
        query: 'apple',
        pageSize: 3
      },
      timeout: 15000
    });
    
    res.json({
      success: true,
      message: 'USDA API is working!',
      totalHits: response.data.totalHits,
      sampleFood: response.data.foods?.[0]?.description,
      sampleNutrients: response.data.foods?.[0]?.foodNutrients?.slice(0, 5).map(n => ({
        name: n.nutrientName,
        value: n.value,
        unit: n.unitName
      }))
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      status: error.response?.status,
      details: error.response?.data,
      hint: error.response?.status === 403 ? 'API key may be invalid' : 'Check API key and try again'
    });
  }
});

// Test Open Food Facts - PUT THIS SECOND
router.get('/test-off', async (req, res) => {
  console.log('\n🧪 === OFF API TEST ===');
  
  try {
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: 'apple',
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 3
      },
      timeout: 20000,
      headers: {
        'User-Agent': 'NutritionApp/1.0'
      }
    });
    
    res.json({
      success: true,
      message: 'Open Food Facts API is working!',
      count: response.data.products?.length || 0,
      sampleProduct: response.data.products?.[0]?.product_name
    });
    
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// Search route - PUT THIS BEFORE /:barcode
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ results: [], message: 'Query too short' });
    }
    
    console.log('\n🔎 === SEARCH REQUEST ===');
    console.log('Query:', query);
    
    let results = [];
    let source = '';
    let errors = [];

    // Try USDA first
    try {
      results = await searchFoodDatabaseUSDA(query);
      source = 'USDA';
      console.log(`✅ USDA returned ${results.length} results`);
    } catch (usdaError) {
      console.log('⚠️ USDA failed:', usdaError.message);
      errors.push({ source: 'USDA', error: usdaError.message });
    }
    
    // Fallback to Open Food Facts if USDA failed or returned nothing
    if (results.length === 0) {
      try {
        results = await searchFoodDatabaseOpenFood(query);
        source = 'Open Food Facts';
        console.log(`✅ OFF returned ${results.length} results`);
      } catch (offError) {
        console.log('⚠️ OFF failed:', offError.message);
        errors.push({ source: 'OFF', error: offError.message });
      }
    }
    
    // Rank results
    if (results.length > 0) {
      results = rankSearchResults(results, query);
    }
    
    console.log(`✅ Returning ${results.length} results from ${source || 'none'}`);
    console.log('=== END SEARCH ===\n');
    
    res.json({ 
      results, 
      source: source || 'none',
      count: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Unexpected search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

// Barcode lookup - PUT THIS LAST (it's a catch-all pattern)
router.get('/:barcode', async (req, res) => {
  const { barcode } = req.params;

  // Skip if it looks like a route name, not a barcode
  if (['search', 'test-usda', 'test-off', 'recipes'].includes(barcode)) {
    return res.status(404).json({ error: 'Route not found' });
  }

  try {
    // Check cache first
    let product = await Product.findOne({ barcode });
    if (product) {
      console.log("✅ Returning from cache:", barcode);
      return res.json({ source: "cache", product });
    }

    // Fetch from Open Food Facts
    console.log("🔍 Looking up barcode:", barcode);
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { timeout: 15000 }
    );

    if (!response.data.product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const p = response.data.product;
    const n = p.nutriments || {};

    const normalized = {
      barcode,
      name: p.product_name || "Unknown",
      brand: p.brands || "Unknown",
      calories: Math.round(n['energy-kcal_100g'] || (n.energy_100g || 0) / 4.184),
      protein: Math.round((n.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((n.fat_100g || 0) * 10) / 10,
      sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
      servingSize: p.serving_size || "100g",
    };

    product = await Product.create(normalized);
    console.log("✅ Saved to cache:", normalized.name);
    res.json({ source: "api", product });
    
  } catch (err) {
    console.error("❌ Barcode lookup error:", err.message);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

module.exports = router;