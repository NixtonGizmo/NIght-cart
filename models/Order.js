const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    userPhone: { type: String, required: true },
    userName: { type: String, required: true },
    
    // --- CRITICAL FIX HERE ---
    userAddress: {
        houseNo: { type: String, default: '' },
        building: { type: String, default: '' },
        area: { type: String, default: '' },
        lat: { type: Number, default: 0 }, // <--- THIS IS MISSING IN YOUR DB
        lng: { type: Number, default: 0 }  // <--- THIS IS MISSING IN YOUR DB
    },

    items: [{
        id: Number,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        weight: String
    }],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        default: 'pending',
        enum: ['pending', 'picking', 'ready', 'out_for_delivery', 'delivered']
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
