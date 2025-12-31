require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const productRoutes = require("./routes/product");
const logRoutes = require("./routes/foodlog");

const app = express();
const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGO_URI);

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/product', productRoutes);
app.use('/api/log', logRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
