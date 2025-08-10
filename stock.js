const db = require('../database/db');

class Stock {
  static async findOne(query) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM Stocks WHERE symbol = ?',
        [query.symbol]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in Stock.findOne:', error);
      throw error;
    }
  }

  static async create(stockData) {
    try {
      const { symbol, name, sector, industry } = stockData;
      const [result] = await db.query(
        'INSERT INTO Stocks (symbol, name, sector, industry) VALUES (?, ?, ?, ?)',
        [symbol, name, sector, industry]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error in Stock.create:', error);
      throw error;
    }
  }

  static async update(symbol, stockData) {
    try {
      const { name, sector, industry } = stockData;
      const [result] = await db.query(
        'UPDATE Stocks SET name = ?, sector = ?, industry = ? WHERE symbol = ?',
        [name, sector, industry, symbol]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in Stock.update:', error);
      throw error;
    }
  }
}

module.exports = Stock; 