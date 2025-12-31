const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: String,
  brand: String,
  sugar: Number,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  servingSize: String,
  raw: Object, // store full OFF response (optional but useful)
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
