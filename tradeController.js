const db = require('../database/db');
const bcrypt = require('bcrypt');
const Stock = require('../models/stock');

exports.trade = async (req, res) => {
  const { username, symbol, quantity, price, type } = req.body;

  try {
    // Debug log
    console.log('Received trade request:', { username, symbol, quantity, price, type });

    // Input validation
    if (!username || !symbol || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Convert quantity and price to numbers
    const numQuantity = parseFloat(quantity);
    const numPrice = parseFloat(price);

    if (isNaN(numQuantity) || numQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Ensure user exists
      console.log('Checking if user exists:', username);
      const [users] = await db.query('SELECT user_id, username FROM users WHERE username = ?', [username]);
      
      if (users.length === 0) {
        throw new Error('User does not exist. Please register or login first.');
      }

      const userId = users[0].user_id;

      // Get current balance
      const [balanceResult] = await db.query(
        'SELECT account_balance FROM Users WHERE user_id = ?',
        [userId]
      );
      const currentBalance = parseFloat(balanceResult[0].account_balance);
      console.log('Current Balance:', currentBalance);

      const transactionAmount = numQuantity * numPrice;
      console.log('Transaction Amount (quantity * price):', transactionAmount);

      // Check if user has sufficient funds for buying
      if (type.toLowerCase() === 'buy' && transactionAmount > currentBalance) {
        throw new Error(`Insufficient funds. Required: $${transactionAmount}, Available: $${currentBalance}`);
      }

      // Get current portfolio holding
      console.log('Checking portfolio for:', { username, symbol });
      const [holdings] = await db.query(
        'SELECT quantity, avg_price FROM Portfolios WHERE user_id = ? AND symbol = ?',
        [userId, symbol]
      );

      if (type.toLowerCase() === 'buy') {
        if (holdings.length === 0) {
          console.log('Creating new portfolio entry:', { username, symbol, quantity, price });
          await db.query(
            'INSERT INTO Portfolios (user_id, username, symbol, quantity, avg_price) VALUES (?, ?, ?, ?, ?)',
            [userId, username, symbol, numQuantity, numPrice]
          );
        } else {
          const currentHolding = holdings[0];
          const newQuantity = parseFloat(currentHolding.quantity) + numQuantity;
          const newAvgPrice = ((parseFloat(currentHolding.quantity) * parseFloat(currentHolding.avg_price)) + (numQuantity * numPrice)) / newQuantity;
          
          console.log('Updating existing portfolio:', { 
            username, 
            symbol, 
            newQuantity, 
            newAvgPrice 
          });

          await db.query(
            'UPDATE Portfolios SET quantity = ?, avg_price = ? WHERE user_id = ? AND symbol = ?',
            [newQuantity, newAvgPrice, userId, symbol]
          );
        }
      } else if (type.toLowerCase() === 'sell') {
        if (holdings.length === 0) {
          throw new Error('Cannot sell stock that is not in portfolio');
        }

        const currentHolding = holdings[0];
        if (parseFloat(currentHolding.quantity) < numQuantity) {
          throw new Error('Insufficient shares to sell');
        }

        const newQuantity = parseFloat(currentHolding.quantity) - numQuantity;
        console.log('Processing sell:', { username, symbol, currentQuantity: currentHolding.quantity, newQuantity });

        if (newQuantity === 0) {
          await db.query(
            'DELETE FROM Portfolios WHERE user_id = ? AND symbol = ?',
            [userId, symbol]
          );
        } else {
          await db.query(
            'UPDATE Portfolios SET quantity = ? WHERE user_id = ? AND symbol = ?',
            [newQuantity, userId, symbol]
          );
        }
      }

      // After all trade operations succeed, update balance and record transaction
      const newBalance = type.toLowerCase() === 'buy' 
        ? currentBalance - transactionAmount 
        : currentBalance + transactionAmount;

      console.log('New Balance before update:', newBalance);

      // Update user's balance
      await db.query(
        'UPDATE Users SET account_balance = ? WHERE user_id = ?',
        [newBalance, userId]
      );

      // Record the transaction
      await db.query(
        'INSERT INTO Transactions (user_id, symbol, quantity, price_per_share, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId, 
          symbol, 
          quantity, 
          price, 
          type.toUpperCase(),
          // Store transactionAmount as negative for buys and positive for sells
          type.toLowerCase() === 'buy' ? -transactionAmount : transactionAmount,
          newBalance,
          `${type.toUpperCase()} ${quantity} shares of ${symbol} at $${price}`
        ]
      );

      // Commit transaction
      await db.query('COMMIT');
      console.log('Trade completed successfully');

      res.status(200).json({ 
        message: 'Trade executed successfully',
        details: {
          symbol,
          quantity,
          price,
          type: type.toLowerCase(),
          total: (quantity * price).toFixed(2)
        }
      });

    } catch (error) {
      // Rollback transaction on error
      console.error('Error during trade execution:', error);
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('Trade error:', err);
    // Send more detailed error information
    res.status(500).json({ 
      error: err.message,
      details: err.code || 'UNKNOWN_ERROR',
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
  }
};

exports.getPortfolio = async (req, res) => {
  const { username } = req.params;
  try {
    // First ensure user exists
    const [users] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].user_id;

    const [rows] = await db.query(`
      SELECT 
        symbol, 
        quantity, 
        avg_price, 
        (quantity * avg_price) as total_value
      FROM Portfolios 
      WHERE user_id = ?
      ORDER BY symbol ASC
    `, [userId]);

    console.log('Portfolio data fetched for user '+ username + ':', rows);

    // Calculate total portfolio value
    const totalValue = rows.reduce((sum, holding) => sum + parseFloat(holding.total_value), 0);

    res.json({
      holdings: rows,
      totalValue: totalValue.toFixed(2)
    });
  } catch (err) {
    console.error('Portfolio error:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.code || 'UNKNOWN_ERROR',
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
  }
};

exports.getTransactions = async (req, res) => {
  const { username } = req.params;
  try {
    // First ensure user exists
    const [users] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].user_id;

    // Get transactions using user_id
    const [rows] = await db.query(`
      SELECT 
        transaction_id, 
        symbol, 
        quantity, 
        price_per_share, 
        type, 
        amount, 
        balance_after, 
        created_at as transaction_time
      FROM Transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);

    console.log('Transactions found:', rows);
    console.log('First transaction_time (tradeController):', rows[0]?.transaction_time);

    res.json(rows);
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.code || 'UNKNOWN_ERROR',
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
  }
};

exports.getChartData = async (req, res) => {
  const axios = require('axios');
  const { symbol } = req.params;
  try {
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    const response = await axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`);
    res.json(response.data);
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.code || 'UNKNOWN_ERROR'
    });
  }
};

exports.getProfileAnalysis = async (req, res) => {
  console.log('Received request for profile analysis', req.params.username);
  const axios = require('axios');
  const { username } = req.params;

  try {
    // First ensure user exists
    const [users] = await db.query('SELECT user_id FROM Users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].user_id;

    // Get portfolio holdings
    const [holdings] = await db.query(
      'SELECT symbol, quantity, avg_price FROM Portfolios WHERE user_id = ?',
      [userId]
    );

    // Get all transactions for analysis
    const [transactions] = await db.query(
      'SELECT symbol, quantity, type, transaction_time, price_per_share, amount FROM Transactions WHERE user_id = ? ORDER BY transaction_time ASC',
      [userId]
    );

    // --- Calculate Realized Gain/Loss ---
    const realizedGainsLosses = [];
    const historicalHoldings = {};

    for (const transaction of transactions) {
      const symbol = transaction.symbol;
      const quantity = parseFloat(transaction.quantity);
      const price = parseFloat(transaction.price_per_share);
      const type = transaction.type.toLowerCase();

      if (!historicalHoldings[symbol]) {
        historicalHoldings[symbol] = { quantity: 0, totalCost: 0 };
      }

      if (type === 'buy') {
        historicalHoldings[symbol].quantity += quantity;
        historicalHoldings[symbol].totalCost += quantity * price;
      } else if (type === 'sell' && historicalHoldings[symbol].quantity > 0) {
        const avgCostAtSale = historicalHoldings[symbol].totalCost / historicalHoldings[symbol].quantity;
        const soldQuantity = Math.min(quantity, historicalHoldings[symbol].quantity);
        const realizedGL = (price - avgCostAtSale) * soldQuantity;

        realizedGainsLosses.push({
          symbol: symbol,
          quantitySold: soldQuantity,
          avgBuyPriceAtSale: avgCostAtSale.toFixed(2),
          sellPrice: price.toFixed(2),
          realizedGainLoss: realizedGL.toFixed(2),
          transactionTime: transaction.transaction_time
        });

        historicalHoldings[symbol].quantity -= soldQuantity;
        historicalHoldings[symbol].totalCost -= avgCostAtSale * soldQuantity;

        if (historicalHoldings[symbol].quantity < 1e-9) {
          historicalHoldings[symbol] = { quantity: 0, totalCost: 0 };
        }
      }
    }

    // --- Calculate Portfolio Growth Over Time ---
    const portfolioGrowth = [];
    let currentValue = 0;

    // Sort transactions by date
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(a.transaction_time) - new Date(b.transaction_time)
    );

    // Process each transaction to build portfolio value over time
    for (const transaction of sortedTransactions) {
      const { symbol, quantity, price_per_share, type } = transaction;
      const price = parseFloat(price_per_share);
      const qty = parseFloat(quantity);

      if (type.toLowerCase() === 'buy') {
        currentValue += price * qty;
      } else if (type.toLowerCase() === 'sell') {
        currentValue -= price * qty;
      }

      portfolioGrowth.push({
        time: transaction.transaction_time,
        value: currentValue
      });
    }

    // --- Calculate Trading Activity Summary ---
    const totalTrades = transactions.length;
    let buyTrades = 0;
    let sellTrades = 0;
    const symbolCounts = {};

    for (const transaction of transactions) {
      if (transaction.type.toUpperCase() === 'BUY') {
        buyTrades++;
      } else if (transaction.type.toUpperCase() === 'SELL') {
        sellTrades++;
      }

      const symbol = transaction.symbol;
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    }

    let mostTradedStock = null;
    let maxTrades = 0;
    for (const symbol in symbolCounts) {
      if (symbolCounts[symbol] > maxTrades) {
        maxTrades = symbolCounts[symbol];
        mostTradedStock = symbol;
      }
    }

    // --- Calculate Portfolio Holdings Performance ---
    let totalPortfolioValue = 0;
    const analysisHoldings = [];
    const apiKey = process.env.ALPHA_VANTAGE_KEY;

    for (const holding of holdings) {
      try {
        const priceResponse = await axios.get(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${holding.symbol}&apikey=${apiKey}`
        );

        const globalQuote = priceResponse.data['Global Quote'];
        let currentPrice = 0;

        if (globalQuote && globalQuote['05. price']) {
          currentPrice = parseFloat(globalQuote['05. price']);
          if (isNaN(currentPrice)) {
            console.warn(`Could not parse current price for ${holding.symbol}`);
            currentPrice = parseFloat(holding.avg_price);
          }
        } else {
          console.warn(`No price data available for ${holding.symbol}`);
          currentPrice = parseFloat(holding.avg_price);
        }

        const currentHoldingValue = currentPrice * parseFloat(holding.quantity);
        const unrealizedGainLoss = (currentPrice - parseFloat(holding.avg_price)) * parseFloat(holding.quantity);

        totalPortfolioValue += currentHoldingValue;

        analysisHoldings.push({
          symbol: holding.symbol,
          quantity: parseFloat(holding.quantity),
          avgPrice: parseFloat(holding.avg_price),
          currentPrice: currentPrice.toFixed(2),
          currentValue: currentHoldingValue.toFixed(2),
          unrealizedGainLoss: unrealizedGainLoss.toFixed(2)
        });

      } catch (apiErr) {
        console.error(`Error fetching price for ${holding.symbol}:`, apiErr.message);
        // Use average price as fallback
        const currentPrice = parseFloat(holding.avg_price);
        const currentHoldingValue = currentPrice * parseFloat(holding.quantity);
        
        analysisHoldings.push({
          symbol: holding.symbol,
          quantity: parseFloat(holding.quantity),
          avgPrice: parseFloat(holding.avg_price),
          currentPrice: currentPrice.toFixed(2),
          currentValue: currentHoldingValue.toFixed(2),
          unrealizedGainLoss: '0.00'
        });
      }
    }

    // Return analysis results
    res.json({
      totalPortfolioValue: totalPortfolioValue.toFixed(2),
      holdings: analysisHoldings,
      tradingActivitySummary: {
        totalTrades,
        buys: buyTrades,
        sells: sellTrades,
        mostTradedStock: mostTradedStock || 'N/A'
      },
      realizedGainsLosses,
      portfolioGrowth
    });

  } catch (err) {
    console.error('Profile analysis error:', err);
    res.status(500).json({
      error: err.message,
      details: err.code || 'UNKNOWN_ERROR',
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
  }
};