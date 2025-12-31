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

module.exports = router;
