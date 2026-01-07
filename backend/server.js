const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true
}));

// Connect to MongoDB (You can use a local string or MongoDB Atlas)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log(err));

// Configure Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // 16-character App Password
    }
});

// ROUTE: Send OTP
app.post('/api/send-otp', async (req, res) => {
    const { email, type, username } = req.body;
    try {
        let user = await User.findOne({ email });

        if (type === 'signup' && user && user.isVerified) {
            return res.status(400).json({ message: "Email already registered. Please Login." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 600000; // 10 mins

        if (user) {
            user.otp = otp;
            user.otpExpires = expires;
            if (username) user.username = username;
            await user.save();
        } else {
            await User.create({ email, username: username || "Customer", otp, otpExpires: expires });
        }

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: type === 'reset' ? "Password Reset Code" : "Signup Verification Code",
            text: `Your code is: ${otp}`
        });

        res.status(200).json({ message: "OTP sent successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// ROUTE: Verify OTP
// 1. Updated Verify OTP (To save password after signup)
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp, password } = req.body;
    try {
        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ message: "Invalid OTP." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.isVerified = true;
        user.otp = null;
        await user.save();

        res.status(200).json({ message: "Verified", username: user.username });
    } catch (err) {
        res.status(500).json({ message: "Verification Error" });
    }
});

// 2. New Login Route (Email & Password)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "Email not found." });

        // Ensure the user is verified
        if (!user.isVerified) return res.status(401).json({ message: "Please verify your email first." });

        // IMPORTANT: Use bcrypt to compare!
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials (Wrong Password)." });
        }

        res.status(200).json({ message: "Success", user: { email: user.email } });
    } catch (err) {
        res.status(500).json({ message: "Server error during login." });
    }
});
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "No account found with this email." });

    // Generate OTP (Reuse your existing OTP logic here)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email logic...
    res.status(200).json({ message: "Reset OTP sent to your email!" });
});

// ROUTE: Finalize Reset
app.post('/api/reset-password-final', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = null;
        user.isVerified = true;
        await user.save();
        res.status(200).json({ message: "Success", username: user.username });
    } catch (err) {
        res.status(500).json({ message: "Error updating password." });
    }
});

// ROUTE: Just verify OTP (for Reset flow)
app.post('/api/verify-otp-only', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });

    if (!user) return res.status(400).json({ message: "Invalid or expired OTP." });
    res.status(200).json({ message: "OTP Verified. Proceed to change password." });
});

app.post('/api/place-order', async (req, res) => {
    const { email, items, total, address, phone, location, payment } = req.body;

    try {
        // 1. Get User ID from database
        const user = await User.findOne({ email });

        // 2. Save Order to MongoDB
        const newOrder = await Order.create({
            userId: user ? user._id : null,
            username: user ? user.username : "Guest",
            email,
            items,
            total,
            address,
            phone,
            location,
            paymentMethod: payment
        });

        // 3. Create Receipt Content
        const itemsList = items.map(i => `<li>${i.name} - $${i.price}</li>`).join('');

        // 4. Send Email
        await transporter.sendMail({
            from: `"Lemonade Store" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Order Confirmed - Receipt #${newOrder._id.toString().slice(-6)}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px;">
                    <h2 style="color: #FFB300;">Order Receipt</h2>
                    <p>Hi ${user.username}, thank you for your order!</p>
                    <hr>
                    <ul>${itemsHtml}</ul>
                    <p><strong>Total: ${total}</strong></p>
                    <p><strong>Payment:</strong> ${payment.toUpperCase()}</p>
                    <p><strong>Delivery Address:</strong> ${address}</p>
                    <hr>
                    <p style="font-size: 12px; color: #888;">Order ID: ${newOrder._id}</p>
                </div>
            `
        });

        res.status(200).json({ message: "Order placed successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Error: Could not save order." });
    }
});

// Get all orders for the dashboard
app.get('/api/all-orders', async (req, res) => {
    try {
        // Find all orders and sort by newest first
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ message: "Failed to load orders" });
    }
});

// Update order status (Mark as Done)
app.patch('/api/update-order/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
        // Don't kill the server, just log the error
    }
};

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;