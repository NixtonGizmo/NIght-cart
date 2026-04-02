const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. DATABASE CONNECTION
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

// Address Model
const Address = mongoose.model('Address', new mongoose.Schema({
  phone: String,
  label: String, // Home, Work, etc.
  houseNo: String,
  building: String,
  landmark: String,
  area: String, // Main address text
  lat: Number,
  lng: Number,
  createdAt: { type: Date, default: Date.now }
}));

// Order Model (FIXED: Added lat/lng to userAddress)
const Order = mongoose.model('Order', new mongoose.Schema({
  orderId: String, 
  userName: String, 
  userPhone: String, 
  userAddress: { 
    houseNo: String,
    building: String,
    landmark: String,
    area: String,
    lat: Number, // <--- ADDED THIS
    lng: Number  // <--- ADDED THIS
  }, 
  items: Array, 
  totalAmount: Number, 
  status: { type: String, default: 'pending' }, // pending, delivered, cancelled
  createdAt: { type: Date, default: Date.now }
}));

// Location Model (GeoJSON Polygon)
const Location = mongoose.model('Location', new mongoose.Schema({
  name: String,
  area: {
    type: { type: String, enum: ['Polygon'], required: true },
    coordinates: { type: [[[Number]]], required: true }
  },
  createdAt: { type: Date, default: Date.now }
}));

// Create Geospatial Index
Location.collection.createIndex({ area: "2dsphere" });

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

// --- ORDER ROUTES ---

// 1. Create Order
app.post('/api/orders', async (req, res) => {
  try {
    const { userName, userPhone, userAddress, items, totalAmount } = req.body;
    const orderId = `ORD-${Date.now()}`;
    const newOrder = new Order({ orderId, userName, userPhone, userAddress, items, totalAmount });
    await newOrder.save();
    res.json({ success: true, orderId });
  } catch (error) {
    console.error("Order Error:", error);
    res.status(500).json({ success: false });
  }
});

// 2. Get All Orders (Admin)
app.get('/api/orders', async (req, res) => {
  try { 
    const orders = await Order.find().sort({ createdAt: -1 }); 
    res.json(orders); 
  } catch (error) { 
    res.status(500).json({ success: false }); 
  }
});

// 3. Get User Orders (Profile)
app.get('/api/orders/user/:phone', async (req, res) => {
  try {
    const phone = req.params.phone;
    const orders = await Order.find({ userPhone: phone }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 4. Mark as Delivered
app.put('/api/orders/:id/deliver', async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: 'delivered' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 5. Cancel Order
app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    await Order.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// Update specific items in an order (e.g., mark out of stock)
app.put('/api/orders/:id/items', async (req, res) => {
  try {
    const { items } = req.body; // Updated items array
    const order = await Order.findByIdAndUpdate(req.params.id, { items }, { new: true });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// --- STAFF ROUTES ---

// 1. Staff Login (Simple hardcoded for prototype)
app.post('/api/staff/login', (req, res) => {
  const { phone, password } = req.body;
  // In real app, check DB. Here we use simple logic:
  // Password is "1234" for any staff phone number
  if (phone && password === "1234") {
    res.json({ success: true, role: 'staff', phone: phone });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials (Use any phone, pass: 1234)" });
  }
});

// 2. Get Orders by Status (For Staff Dashboard)
app.get('/api/staff/orders', async (req, res) => {
  try {
    // Fetch orders that are NOT cancelled or delivered
    const orders = await Order.find({ 
      status: { $in: ['pending', 'picking', 'ready', 'out_for_delivery'] } 
    }).sort({ createdAt: 1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 3. Update Order Status (The core logic)
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'picking', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});  

// --- ADDRESS ROUTES ---

// 1. Get Saved Addresses
app.get('/api/addresses/:phone', async (req, res) => {
  try {
    const addresses = await Address.find({ phone: req.params.phone }).sort({ createdAt: -1 });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 2. Save New Address
app.post('/api/addresses', async (req, res) => {
  try {
    const { phone, label, houseNo, building, landmark, area, lat, lng } = req.body;
    const newAddress = new Address({ phone, label, houseNo, building, landmark, area, lat, lng });
    await newAddress.save();
    res.json({ success: true, address: newAddress });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 3. Delete Address
app.delete('/api/addresses/:id', async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 4. Update Address (Edit)
app.put('/api/addresses/:id', async (req, res) => {
  try {
    const { label, houseNo, building, landmark, area, lat, lng } = req.body;
    const updatedAddress = await Address.findByIdAndUpdate(
      req.params.id, 
      { label, houseNo, building, landmark, area, lat, lng }, 
      { new: true }
    );
    res.json({ success: true, address: updatedAddress });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// --- LOCATION ROUTES (Map/Polygon) ---

// 1. Add Location
app.post('/api/locations', async (req, res) => {
  try {
    const { name, coordinates } = req.body; // coordinates: [[lng, lat], [lng, lat]...]
    
    // GeoJSON Polygon requires the ring to be closed (first point === last point)
    let finalCoords = coordinates;
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    
    // Check if loop is not closed
    if (first[0] !== last[0] || first[1] !== last[1]) {
      finalCoords.push(first); // Close the loop
    }

    const newLocation = new Location({
      name,
      area: { type: 'Polygon', coordinates: [finalCoords] } // Polygon expects array of linear rings
    });
    await newLocation.save();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// 2. Get All Locations
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 3. Delete Location
app.delete('/api/locations/:id', async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 4. Check User Location
app.post('/api/check-location', async (req, res) => {
  try {
    const { userLat, userLng } = req.body;
    
    // Check if user point intersects with ANY saved polygon
    const isServiceable = await Location.findOne({
      area: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [userLng, userLat] // GeoJSON is [Longitude, Latitude]
          }
        }
      }
    });

    res.json({ serviceable: !!isServiceable });
  } catch (error) {
    console.error(error);
    // If error (or no locations), default to true so you don't block users by mistake during server error
    res.json({ serviceable: true }); 
  }
});

// 5. START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
