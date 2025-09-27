const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const LOG_TOKENS = (process.env.LOG_TOKENS || 'true').toLowerCase() === 'true';

// Generate JWT token with id, email and role
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

exports.register = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body missing. Ensure you send JSON and set Content-Type: application/json' });
    }

    const { name, email, password, role, address } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }

    const allowedRoles = ['resident', 'collector', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password, role, address });
    const token = generateToken(user);

    if (LOG_TOKENS) {
      console.log('[AUTH][REGISTER] user:', user.email, 'role:', user.role, 'token:', token);
    }

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, address: user.address },
      token
    });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body missing. Ensure you send JSON and set Content-Type: application/json' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);

    if (LOG_TOKENS) {
      console.log('[AUTH][LOGIN] user:', user.email, 'role:', user.role, 'token:', token);
    }

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, address: user.address },
      token
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
