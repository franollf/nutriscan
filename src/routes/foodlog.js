const express = require("express");
const FoodLog = require("../models/FoodLog");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// POST /api/log — create a food log
router.post("/", requireAuth, async (req, res) => {
  try {
    const log = await FoodLog.create({
      user: req.user._id,   // ✅ MATCHES SCHEMA
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

    const query = { user: req.user._id }; // ✅ MATCHES SCHEMA

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
    
    console.log('Delete request:', { logId, itemIndex, userId: req.user._id }); // Debug log
    
    // Use FoodLog model and user field (not userId)
    const log = await FoodLog.findOne({ _id: logId, user: req.user._id });
    
    if (!log) {
      console.log('Log not found'); // Debug log
      return res.status(404).json({ message: 'Log not found' });
    }
    
    console.log('Log found, items before delete:', log.items.length); // Debug log
    
    // Remove the item at the specified index
    log.items.splice(parseInt(itemIndex), 1);
    
    console.log('Items after delete:', log.items.length); // Debug log
    
    // If no items left, delete the entire log
    if (log.items.length === 0) {
      await FoodLog.findByIdAndDelete(logId);
      console.log('Log deleted (no items left)'); // Debug log
      return res.json({ message: 'Item and log deleted successfully' });
    } else {
      await log.save();
      console.log('Log saved with remaining items'); // Debug log
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
    
    // Update the item at the specified index
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