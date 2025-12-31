const express = require("express");
const axios = require("axios");
const Product = require("../models/Product");
const router = express.Router();

router.get("/:barcode", async (req, res) => {
  const { barcode } = req.params;

  try {
    let product = await Product.findOne({ barcode });
    if (product) {
  console.log("RETURNING FROM CACHE:", product);
  return res.json({ source: "cache", product });
}

    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const response = await axios.get(url);

    if (!response.data.product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const p = response.data.product;

    const normalized = {
      barcode,
      name: p.product_name || "Unknown",
      brand: p.brands || "Unknown",
      calories: p.nutriments?.["energy-kcal_100g"] ?? null,
      protein: p.nutriments?.proteins_100g ?? null,
      carbs: p.nutriments?.carbohydrates_100g ?? null,
      fat: p.nutriments?.fat_100g ?? null,
      sugar: p.nutriments?.["sugars_100g"] || 0,
      servingSize: p.serving_size || "100g",
      raw: p,
    };

    product = await Product.create(normalized);
    res.json({ source: "api", product });
  } catch (err) {
    console.error("OFF ERROR:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
