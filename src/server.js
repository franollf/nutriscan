const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const foodlogRoutes = require('./routes/foodlog');
const aiRoutes = require('./routes/ai');
const mealRoutes = require('./routes/meals'); // ADD THIS

app.use('/api/auth', authRoutes);
app.use('/api/product', productRoutes);
app.use('/api/log', foodlogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/meals', mealRoutes); // ADD THIS

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));