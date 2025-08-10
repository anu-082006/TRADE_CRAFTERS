const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'your_jwt_secret'; // Use environment variable for secret

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided or malformed token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Set user payload to req.user
    next();
  });
}; 