const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

// Route to get profile analysis data
router.get('/analysis/:username', tradeController.getProfileAnalysis);

// You might have other trade related routes here as well, e.g.,
// router.post('/trade', tradeController.trade);
// router.get('/portfolio/:username', tradeController.getPortfolio);
// router.get('/transactions/:username', tradeController.getTransactions);
// router.get('/chartdata/:symbol', tradeController.getChartData);

module.exports = router;
