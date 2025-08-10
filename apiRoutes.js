const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const userController = require('../controllers/userController');
const authenticateJWT = require('../middleware/authenticateJWT');
const adminCheck = require('../middleware/adminCheck');

// Trade routes
router.post('/trade', tradeController.trade);
router.get('/portfolio/:username', tradeController.getPortfolio);
router.get('/transactions/:username', tradeController.getTransactions);
router.get('/stocks/chart/:symbol', tradeController.getChartData);
router.get('/analysis/:username', tradeController.getProfileAnalysis);

// Auth routes
router.post('/auth/register', userController.register);
router.post('/auth/login', userController.login);
router.delete('/auth/delete', userController.deleteAccount);

// Admin routes
router.get('/users/admin/users', authenticateJWT, adminCheck, userController.getAllUsers);
router.get('/users/admin/user/:id/portfolio', authenticateJWT, adminCheck, userController.getUserPortfolio);
router.get('/users/admin/user/:id/trades', authenticateJWT, adminCheck, userController.getUserTrades);
router.post('/users/admin/user/:id/toggle-active', authenticateJWT, adminCheck, userController.toggleUserActive);
router.delete('/users/admin/user/:id', authenticateJWT, adminCheck, userController.deleteUser);
router.get('/users/admin/stats', authenticateJWT, adminCheck, userController.getSystemStats);

module.exports = router;