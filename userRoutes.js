const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const adminCheck = require('../middleware/adminCheck');
const authenticateJWT = require('../middleware/authenticateJWT');

// User registration
router.post('/register', userController.register);

// User login
router.post('/login', userController.login);

// Admin routes (now protected by authenticateJWT and adminCheck)
router.get('/admin/users', authenticateJWT, adminCheck, userController.getAllUsers);
router.get('/admin/user/:id/portfolio', authenticateJWT, adminCheck, userController.getUserPortfolio);
router.get('/admin/user/:id/trades', authenticateJWT, adminCheck, userController.getUserTrades);
router.post('/admin/user/:id/toggle-active', authenticateJWT, adminCheck, userController.toggleUserActive);
router.get('/admin/stats', authenticateJWT, adminCheck, userController.getSystemStats);

module.exports = router;
