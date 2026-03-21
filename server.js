const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE SETUP
app.use(cors()); // Allows your GitHub frontend to talk to this server
app.use(express.json()); // Allows server to read JSON data

// 2. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:BgK18x5FvZYftNWi@cluster0.3demhgn.mongodb.net/nightcart?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 3. DATA MODELS (Database Structure)

// User Model - Updated with Name, DOB, Gender
const User = mongoose.model('User', new mongoose.Schema({
  phone: String,
  otp: String,
  name: String,
  dob: String,
  gender: String,
  createdAt: { type: Date, default: Date.now }
}));

// Product Model
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

// --- A. HOME ROUTE ---
app.get('/', (req, res) => {
  res.send('<h1>🚀 Night Cart Server is Running!</h1><p>Backend connected successfully.</p>');
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
      
      // Check if user is new (has no name) or existing
      if (!user.name) {
        // NEW USER: Ask frontend to show profile form
        return res.json({ success: true, isNew: true });
      } else {
        // EXISTING USER: Send back user data
        return res.json({ 
          success: true, 
          isNew: false,
          user: {
            name: user.name,
            dob: user.dob,
            gender: user.gender
          }
        });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route to Update Profile (Step 3)
app.post('/api/update-profile', async (req, res) => {
  const { phone, name, dob, gender } = req.body;

  try {
    // Find user by phone and update their profile
    const updatedUser = await User.findOneAndUpdate(
      { phone: phone },
      { name: name, dob: dob, gender: gender },
      { new: true }
    );

    if (updatedUser) {
      res.json({ success: true, message: "Profile updated" });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// --- C. PRODUCT SYSTEM ---

// Route to Get All Products (For Main Page)
app.get('/api/products', async (req, res) => {
  try {
    let products = await Product.find();
    
    // If database is empty, add default products (for first time setup)
    if (products.length === 0) {
      const defaultProducts = [
        { id: 1, name: "Fresh Bananas", weight: "1 kg", price: 49, originalPrice: 65, discount: 25, image: "https://picsum.photos/seed/banana/300/300", category: "fruits" },
        { id: 2, name: "Organic Apples", weight: "500 g", price: 89, originalPrice: 120, discount: 26, image: "https://picsum.photos/seed/apple/300/300", category: "fruits" },
        { id: 3, name: "Spicy Chips", weight: "150 g", price: 35, originalPrice: 45, discount: 22, image: "https://picsum.photos/seed/chips/300/300", category: "snacks" },
        { id: 4, name: "Orange Juice", weight: "1 L", price: 85, originalPrice: 99, discount: 14, image: "https://picsum.photos/seed/juice/300/300", category: "beverages" },
        { id: 5, name: "Chocolate Cookies", weight: "200 g", price: 60, originalPrice: 80, discount: 25, image: "https://picsum.photos/seed/cookies/300/300", category: "snacks" },
      ];
      
      await Product.insertMany(defaultProducts);
      products = defaultProducts;
    }

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
