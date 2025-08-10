-- Create the database
DROP DATABASE IF EXISTS StockMarketDB;
CREATE DATABASE StockMarketDB;
USE StockMarketDB;

-- User table with authentication fields
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('TRADER', 'ADMIN') NOT NULL DEFAULT 'TRADER',
    account_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CHECK (account_balance >= 0)
) ENGINE=InnoDB;

-- User sessions for JWT token management
CREATE TABLE UserSessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    jwt_token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Stocks table
CREATE TABLE Stocks (
    stock_id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    company_name VARCHAR(100) NOT NULL,
    sector VARCHAR(50),
    industry VARCHAR(50),
    current_price DECIMAL(10,2) NOT NULL,
    previous_close DECIMAL(10,2),
    day_high DECIMAL(10,2),
    day_low DECIMAL(10,2),
    volume BIGINT,
    market_cap BIGINT,
    pe_ratio DECIMAL(10,2),
    dividend_yield DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (current_price > 0)
) ENGINE=InnoDB;

-- Portfolios
CREATE TABLE Portfolios (
    portfolio_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    avg_price DECIMAL(10,2) NOT NULL,
    name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_holding (username, symbol)
) ENGINE=InnoDB;

-- Transactions history
CREATE TABLE Transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Link to Users table
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    order_id INT NULL, -- This column is kept for potential future use or compatibility, but its foreign key is removed
    stock_id INT NULL, -- This column is kept for potential future use or compatibility, but its foreign key is removed
    symbol VARCHAR(50),
    quantity INT NOT NULL DEFAULT 0,
    avg_price DECIMAL(10,2),
    type ENUM('TRADE', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'BUY', 'SELL') NOT NULL,
    price_per_share DECIMAL(10,2),
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    -- The foreign key constraints for order_id and stock_id are removed here
);

-- Additional Indexes for performance
-- CREATE INDEX idx_stock_symbol ON Stocks(symbol); -- Keep this index
-- Remove this index as Orders table is removed
-- CREATE INDEX idx_portfolio_holdings ON PortfolioHoldings(portfolio_id); -- Remove this index
CREATE INDEX idx_user_transactions ON Transactions (user_id, type, transaction_time); -- Keep this index
-- Remove this index as StockPriceHistory table is removed
SHOW TABLES;