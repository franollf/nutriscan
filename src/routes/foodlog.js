const express = require("express");
const FoodLog = require("../models/FoodLog");
const requireAuth = require("../middleware/auth");
const axios = require("axios");

const router = express.Router();

// USDA FoodData Central Search with better error handling
async function searchFoodDatabaseUSDA(query) {
  try {
    const USDA_API_KEY = process.env.USDA_API_KEY;
    
    if (!USDA_API_KEY || USDA_API_KEY === 'DEMO_KEY') {
      console.error('⚠️ USDA_API_KEY not set in environment variables');
      throw new Error('API key not configured');
    }
    
    console.log('🔍 Searching USDA for:', query);
    console.log('🔑 Using API key:', USDA_API_KEY.substring(0, 8) + '...');
    
    const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        api_key: USDA_API_KEY,
        query: query,
        pageSize: 15,
        dataType: ['Branded', 'Survey (FNDDS)', 'Foundation']
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('✅ USDA Response status:', response.status);
    console.log('📊 Foods found:', response.data?.foods?.length || 0);

    if (!response.data || !response.data.foods) {
      console.log('⚠️ No foods in response');
      return [];
    }

    const results = response.data.foods.map(food => {
      const nutrients = food.foodNutrients || [];
      
      const findNutrient = (names) => {
        const nutrient = nutrients.find(n => names.some(name => 
          n.nutrientName?.toLowerCase().includes(name.toLowerCase())
        ));
        return nutrient ? nutrient.value : 0;
      };

      return {
        name: food.description || food.lowercaseDescription || 'Unknown Product',
        barcode: food.gtinUpc || '',
        calories: Math.round(findNutrient(['Energy'])),
        protein: parseFloat(findNutrient(['Protein']).toFixed(1)),
        carbs: parseFloat(findNutrient(['Carbohydrate']).toFixed(1)),
        fat: parseFloat(findNutrient(['Total lipid', 'Fat']).toFixed(1)),
        sugar: parseFloat(findNutrient(['Sugars, total', 'Sugars']).toFixed(1)),
      };
    });

    console.log('✅ Processed results:', results.length);
    return results;

  } catch (error) {
    console.error('❌ USDA Search Error:', error.message);
    console.error('📍 Error details:', {
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}

// Open Food Facts as fallback (no API key needed)
async function searchFoodDatabaseOpenFood(query) {
  try {
    console.log('🔍 Searching Open Food Facts for:', query);
    
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 15,
        fields: 'product_name,nutriments,code,brands'
      },
      timeout: 10000
    });

    console.log('✅ Open Food Facts Response');
    console.log('📊 Products found:', response.data?.products?.length || 0);

    if (!response.data || !response.data.products) {
      return [];
    }

    const results = response.data.products
      .filter(product => product.product_name) // Only products with names
      .map(product => {
        const nutriments = product.nutriments || {};
        
        return {
          name: `${product.product_name}${product.brands ? ' - ' + product.brands : ''}`,
          barcode: product.code || '',
          calories: Math.round(nutriments['energy-kcal_100g'] || nutriments.energy_100g / 4.184 || 0),
          protein: parseFloat((nutriments.proteins_100g || 0).toFixed(1)),
          carbs: parseFloat((nutriments.carbohydrates_100g || 0).toFixed(1)),
          fat: parseFloat((nutriments.fat_100g || 0).toFixed(1)),
          sugar: parseFloat((nutriments.sugars_100g || 0).toFixed(1)),
        };
      });

    console.log('✅ Processed Open Food Facts results:', results.length);
    return results;

  } catch (error) {
    console.error('❌ Open Food Facts Error:', error.message);
    throw error;
  }
}

// GET /api/product/search - Search for food products
router.get('/product/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({ results: [] });
    }
    
    console.log('\n🔎 === FOOD SEARCH REQUEST ===');
    console.log('Query:', query);
    
    let results = [];
    let searchMethod = '';

    // Try USDA first
    try {
      results = await searchFoodDatabaseUSDA(query);
      searchMethod = 'USDA';
    } catch (usdaError) {
      console.log('⚠️ USDA failed, trying Open Food Facts...');
      
      // Fallback to Open Food Facts
      try {
        results = await searchFoodDatabaseOpenFood(query);
        searchMethod = 'Open Food Facts';
      } catch (offError) {
        console.error('❌ Both APIs failed');
        return res.status(500).json({ 
          error: 'Search failed', 
          message: 'Unable to search food databases. Please try again.',
          details: {
            usda: usdaError.message,
            openFoodFacts: offError.message
          }
        });
      }
    }
    
    console.log(`✅ Search completed via ${searchMethod}`);
    console.log(`📊 Returning ${results.length} results`);
    console.log('=== END SEARCH ===\n');
    
    res.json({ results, source: searchMethod });
    
  } catch (error) {
    console.error('❌ Unexpected search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

// POST /api/log — create a food log
router.post("/", requireAuth, async (req, res) => {
  try {
    const log = await FoodLog.create({
      user: req.user._id,
      ...req.body
    });

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/log — get logs (optionally by date range)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query;

    const query = { user: req.user._id };

    if (start && end) {
      query.date = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    const logs = await FoodLog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/log/:logId/item/:itemIndex
router.delete("/:logId/item/:itemIndex", requireAuth, async (req, res) => {
  try {
    const { logId, itemIndex } = req.params;
    
    console.log('Delete request:', { logId, itemIndex, userId: req.user._id });
    
    const log = await FoodLog.findOne({ _id: logId, user: req.user._id });
    
    if (!log) {
      console.log('Log not found');
      return res.status(404).json({ message: 'Log not found' });
    }
    
    console.log('Log found, items before delete:', log.items.length);
    
    log.items.splice(parseInt(itemIndex), 1);
    
    console.log('Items after delete:', log.items.length);
    
    if (log.items.length === 0) {
      await FoodLog.findByIdAndDelete(logId);
      console.log('Log deleted (no items left)');
      return res.json({ message: 'Item and log deleted successfully' });
    } else {
      await log.save();
      console.log('Log saved with remaining items');
      return res.json({ message: 'Item deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/log/:logId/item/:itemIndex - Update item serving size
router.put("/:logId/item/:itemIndex", requireAuth, async (req, res) => {
  try {
    const { logId, itemIndex } = req.params;
    const updatedItem = req.body;
    
    console.log('Update request:', { logId, itemIndex, updatedItem, userId: req.user._id });
    
    const log = await FoodLog.findOne({ _id: logId, user: req.user._id });
    
    if (!log) {
      console.log('Log not found');
      return res.status(404).json({ message: 'Log not found' });
    }
    
    if (itemIndex < 0 || itemIndex >= log.items.length) {
      return res.status(400).json({ message: 'Invalid item index' });
    }
    
    log.items[itemIndex] = {
      ...log.items[itemIndex],
      ...updatedItem
    };
    
    await log.save();
    console.log('Item updated successfully');
    
    res.json({ message: 'Item updated successfully', log });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;