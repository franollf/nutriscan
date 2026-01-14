const mongoose = require('mongoose');

const mealItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  servingSize: { type: Number, default: 1 },
});

const mealSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    default: ''
  },
  items: [mealItemSchema],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt timestamp before saving
mealSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Meal', mealSchema);