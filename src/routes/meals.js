const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const auth = require('../middleware/auth'); // Your auth middleware

// GET /api/meals - Get all meals for user
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Fetching meals for user:', req.user.id);
    
    const meals = await Meal.find({ userId: req.user.id })
      .sort({ updatedAt: -1 });
    
    console.log(`✅ Found ${meals.length} meals`);
    
    res.json({ meals });
  } catch (error) {
    console.error('❌ Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// POST /api/meals - Create new meal
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, items } = req.body;
    
    console.log('\n🍽️ === CREATE MEAL ===');
    console.log('User:', req.user.id);
    console.log('Name:', name);
    console.log('Items count:', items?.length);
    
    // Validation
    if (!name || !name.trim()) {
      console.log('❌ Validation failed: No name');
      return res.status(400).json({ error: 'Meal name is required' });
    }
    
    if (!items || items.length === 0) {
      console.log('❌ Validation failed: No items');
      return res.status(400).json({ error: 'At least one item is required' });
    }
    
    // Create meal
    const meal = new Meal({
      userId: req.user.id,
      name: name.trim(),
      description: description?.trim() || '',
      items: items.map(item => ({
        name: item.name,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        sugar: item.sugar || 0,
        servingSize: item.servingSize || 1,
      }))
    });
    
    await meal.save();
    
    console.log('✅ Meal created:', meal._id);
    console.log('=== END CREATE MEAL ===\n');
    
    res.status(201).json({ 
      message: 'Meal created successfully',
      meal 
    });
    
  } catch (error) {
    console.error('❌ Error creating meal:', error);
    console.error('Stack:', error.stack);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    res.status(500).json({ 
      error: 'Failed to create meal',
      details: error.message 
    });
  }
});

// PUT /api/meals/:id - Update meal
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, items } = req.body;
    
    console.log('\n✏️ === UPDATE MEAL ===');
    console.log('Meal ID:', id);
    console.log('User:', req.user.id);
    
    // Find meal and verify ownership
    const meal = await Meal.findOne({ _id: id, userId: req.user.id });
    
    if (!meal) {
      console.log('❌ Meal not found or unauthorized');
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    // Update fields
    if (name) meal.name = name.trim();
    if (description !== undefined) meal.description = description.trim();
    if (items && items.length > 0) {
      meal.items = items.map(item => ({
        name: item.name,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        sugar: item.sugar || 0,
        servingSize: item.servingSize || 1,
      }));
    }
    
    await meal.save();
    
    console.log('✅ Meal updated');
    console.log('=== END UPDATE MEAL ===\n');
    
    res.json({ 
      message: 'Meal updated successfully',
      meal 
    });
    
  } catch (error) {
    console.error('❌ Error updating meal:', error);
    res.status(500).json({ 
      error: 'Failed to update meal',
      details: error.message 
    });
  }
});

// DELETE /api/meals/:id - Delete meal
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('\n🗑️ === DELETE MEAL ===');
    console.log('Meal ID:', id);
    console.log('User:', req.user.id);
    
    const meal = await Meal.findOneAndDelete({ 
      _id: id, 
      userId: req.user.id 
    });
    
    if (!meal) {
      console.log('❌ Meal not found or unauthorized');
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    console.log('✅ Meal deleted');
    console.log('=== END DELETE MEAL ===\n');
    
    res.json({ message: 'Meal deleted successfully' });
    
  } catch (error) {
    console.error('❌ Error deleting meal:', error);
    res.status(500).json({ 
      error: 'Failed to delete meal',
      details: error.message 
    });
  }
});

module.exports = router;