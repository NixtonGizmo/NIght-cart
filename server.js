const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. DATABASE CONNECTION
// Use environment variable OR the hardcoded string as backup
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:BgK18x5FvZYftNWi@cluster0.3demhgn.mongodb.net/nightcart?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 3. MODELS

// User Model
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

// Order Model (CRITICAL FOR CHECKOUT)
const Order = mongoose.model('Order', new mongoose.Schema({
  orderId: String, 
  userName: String, 
  userPhone: String, 
  items: Array, 
  totalAmount: Number, 
  status: { type: String, default: 'pending' }, 
  createdAt: { type: Date, default: Date.now }
}));

// 4. ROUTES

// --- Home ---
app.get('/', (req, res) => res.send('<h1>🚀 Night Cart Server is Running!</h1>'));

// --- Admin Login ---
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const ADMIN_EMAIL = 'nixton2007@nightcart.com';
  const ADMIN_PASSWORD = 'Gulu@2006';
  
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid Email or Password" });
  }
});

// --- Users ---
app.get('/api/users', async (req, res) => {
  try { 
    const users = await User.find({}, { otp: 0 }).sort({ createdAt: -1 }); 
    res.json(users); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

// --- Auth Routes (OTP) ---
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  try { 
    await User.findOneAndUpdate({ phone }, { otp }, { upsert: true, new: true }); 
    console.log(`📱 OTP for ${phone}: ${otp}`); 
    res.json({ success: true }); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const user = await User.findOne({ phone, otp });
    if (user) {
      await User.updateOne({ _id: user._id }, { $unset: { otp: "" } });
      if (!user.name) { 
        res.json({ success: true, isNew: true }); 
      } else { 
        res.json({ success: true, isNew: false, user: { name: user.name, dob: user.dob, gender: user.gender } }); 
      }
    } else { 
      res.status(400).json({ success: false, message: "Invalid OTP" }); 
    }
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

app.post('/api/update-profile', async (req, res) => {
  const { phone, name, dob, gender } = req.body;
  try { 
    await User.findOneAndUpdate({ phone }, { name, dob, gender }); 
    res.json({ success: true }); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
  try { 
    const products = await Product.find(); 
    res.json(products); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

app.post('/api/products', async (req, res) => {
  try { 
    const newProduct = new Product(req.body); 
    await newProduct.save(); 
    res.json({ success: true }); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try { 
    await Product.deleteOne({ id: req.params.id }); 
    res.json({ success: true }); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

// --- Order Routes (CRITICAL FOR CHECKOUT) ---

// 1. Create Order (Used by Cart.html)
app.post('/api/orders', async (req, res) => {
  try {
    const { userName, userPhone, items, totalAmount } = req.body;
    const orderId = `ORD-${Date.now()}`;
    const newOrder = new Order({ orderId, userName, userPhone, items, totalAmount });
    await newOrder.save();
    res.json({ success: true, orderId });
  } catch (error) {
    console.error("Order Error:", error);
    res.status(500).json({ success: false });
  }
});

// 2. Get All Orders (Used by Admin.html)
app.get('/api/orders', async (req, res) => {
  try { 
    const orders = await Order.find().sort({ createdAt: -1 }); 
    res.json(orders); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

// 3. Update Order Status (Used by Admin.html)
app.put('/api/orders/:id/deliver', async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: 'delivered' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 5. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
