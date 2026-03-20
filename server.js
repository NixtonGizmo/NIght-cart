const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE SETUP
app.use(cors()); // Allows your GitHub frontend to talk to this server
app.use(express.json()); // Allows server to read JSON data

// 2. DATABASE CONNECTION
// This tries to get the URL from Environment Variables (Render), 
// or falls back to the string below if testing locally.
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:BgK18x5FvZYftNWi@cluster0.3demhgn.mongodb.net/nightcart?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 3. DATA MODELS (Database Structure)

// User Model (for OTP login)
const User = mongoose.model('User', new mongoose.Schema({
  phone: String,
  otp: String,
  createdAt: { type: Date, default: Date.now }
}));

// Product Model (for Admin Panel)
const Product = mongoose.model('Product', new mongoose.Schema({
  id: Number,
  name: String,
  weight: String,
  price: Number,
  originalPrice: Number,
  discount: Number,
  image: String,
  category: String
}));

// 4. ROUTES

// --- A. HOME ROUTE (Fixes "Cannot GET /" error) ---
app.get('/', (req, res) => {
  res.send('<h1>🚀 Night Cart Server is Running!</h1><p>Your backend is connected successfully.</p>');
});

// --- B. LOGIN SYSTEM ---

// Route to Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "Phone number is required" });
  }

  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    // Save OTP to Database (Update if user exists, Create if new)
    await User.findOneAndUpdate(
      { phone: phone },
      { otp: otp },
      { upsert: true, new: true }
    );

    // IN REAL PRODUCTION: Use Twilio/MSG91 to send SMS here.
    // For now, we just log it to the console.
    console.log(`--------------------------------------------------`);
    console.log(`📱 OTP for ${phone} is: ${otp}`);
    console.log(`--------------------------------------------------`);

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;

  try {
    // Check if OTP matches in database
    const user = await User.findOne({ phone, otp });

    if (user) {
      // Delete OTP after successful use (security best practice)
      await User.updateOne({ _id: user._id }, { $unset: { otp: "" } });
      
      return res.json({ success: true, message: "Login Successful" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// --- C. PRODUCT SYSTEM ---

// Route to Get All Products (For Main Page)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products" });
  }
});

// Route to Add Product (For Admin Panel)
app.post('/api/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ success: true, message: "Product added" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding product" });
  }
});

// Route to Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});


// 5. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
