// ==========================================
// controllers/authController.js
// Handles register, login, getProfile
// ==========================================

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Helper: generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ── @route  POST /api/auth/register ─────────
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user (password gets hashed by the model's pre-save hook)
    const user = await User.create({ name, email, password, role: role || 'user' });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── @route  POST /api/auth/login ────────────
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly include password (it's excluded by default)
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── @route  GET /api/auth/me ─────────────────
// Protected route — returns current logged-in user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { registerUser, loginUser, getMe };
