const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  barcode: String,
  name: String,
  servingSize: String,
  quantity: Number,
  calories: Number,
  carbs: Number,
  protein: Number,
  fat: Number,
  // store raw external API response if helpful
  raw: mongoose.Schema.Types.Mixed
});

const foodLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  items: [itemSchema],
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('FoodLog', foodLogSchema);
