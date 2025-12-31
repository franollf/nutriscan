const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  // optional profile fields / goals
  caloriesGoal: { type: Number, default: 2000 },
  macrosGoal: {
    carbs: { type: Number, default: 50 }, // percent or grams depending on app design
    protein: { type: Number, default: 20 },
    fat: { type: Number, default: 30 }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
