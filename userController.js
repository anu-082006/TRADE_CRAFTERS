const db = require('../database/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Input validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const [existingUsers] = await db.query(
            'SELECT username FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create new user
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, account_balance) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, 10000.00] // Starting balance of $10,000
        );

        res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertId,
            username,
            email
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            error: err.message,
            details: err.code || 'UNKNOWN_ERROR'
        });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Input validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing username or password' });
        }

        // Get user by username only (not email)
        const [users] = await db.query(
            'SELECT user_id, username, password_hash, role FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = users[0];

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [user.user_id]
        );

        res.json({
            success: true,
            message: 'Login successful',
            username: user.username,
            role: user.role,
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: err.message,
            details: err.code || 'UNKNOWN_ERROR'
        });
    }
};

exports.deleteAccount = async (req, res) => {
    const { username } = req.body;

    try {
        // Input validation
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Start transaction
        await db.query('START TRANSACTION');

        try {
            // Delete user's portfolio entries
            await db.query('DELETE FROM Portfolios WHERE username = ?', [username]);

            // Delete user's transactions
            await db.query('DELETE FROM Transactions WHERE username = ?', [username]);

            // Delete the user
            const [result] = await db.query('DELETE FROM Users WHERE username = ?', [username]);

            if (result.affectedRows === 0) {
                throw new Error('User not found');
            }

            // Commit transaction
            await db.query('COMMIT');

            res.json({
                success: true,
                message: 'Account deleted successfully'
            });

        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }

    } catch (err) {
        console.error('Account deletion error:', err);
        res.status(500).json({
            error: err.message,
            details: err.code || 'UNKNOWN_ERROR'
        });
    }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        user_id, 
        username, 
        email, 
        role, 
        account_balance, 
        created_at,
        is_active
      FROM Users
      ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get a user's portfolio (admin only)
exports.getUserPortfolio = async (req, res) => {
  const userId = req.params.id;
  try {
    const [portfolio] = await db.query('SELECT * FROM Portfolios WHERE user_id = ?', [userId]);
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a user's trade history (admin only)
exports.getUserTrades = async (req, res) => {
  const userId = req.params.id;
  try {
    const [trades] = await db.query(`SELECT 
      transaction_id, 
      symbol, 
      quantity, 
      price_per_share, 
      type, 
      amount, 
      balance_after, 
      created_at as transaction_time
      FROM Transactions WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deactivate/reactivate a user (admin only)
exports.toggleUserActive = async (req, res) => {
  const userId = req.params.id;
  try {
    // Get current status
    const [users] = await db.query('SELECT is_active FROM Users WHERE user_id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const newStatus = !users[0].is_active;
    await db.query('UPDATE Users SET is_active = ? WHERE user_id = ?', [newStatus, userId]);
    res.json({ user_id: userId, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get system-wide statistics (admin only)
exports.getSystemStats = async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) AS total_users FROM Users');
    const [[{ total_trades }]] = await db.query('SELECT COUNT(*) AS total_trades FROM Transactions');
    res.json({ total_users, total_trades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Delete user's portfolio entries
      await db.query('DELETE FROM Portfolios WHERE user_id = ?', [userId]);

      // Delete user's transactions
      await db.query('DELETE FROM Transactions WHERE user_id = ?', [userId]);

      // Delete the user
      const [result] = await db.query('DELETE FROM Users WHERE user_id = ?', [userId]);

      if (result.affectedRows === 0) {
        throw new Error('User not found');
      }

      // Commit transaction
      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'User and all associated data deleted successfully'
      });

    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('User deletion error:', err);
    res.status(500).json({
      error: err.message,
      details: err.code || 'UNKNOWN_ERROR'
    });
  }
};
