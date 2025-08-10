import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import StockChart from './components/StockChart';
import Portfolio from './components/Portfolio';
import TradeForm from './components/TradeForm';
import TransactionHistory from './components/TransactionHistory';
import ProfileAnalysis from './components/ProfileAnalysis';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import axios from 'axios';
import './App.css';

function App() {
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(0);

  const handleLogin = (user) => {
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUsername('');
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      const response = await axios.delete('http://localhost:5000/api/auth/delete', {
        data: { username }
      });

      if (response.data.success) {
        handleLogout();
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  const triggerPortfolioRefresh = () => {
    setPortfolioRefreshTrigger(prev => prev + 1);
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    if (!username) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <Router>
      <div className="app-container">
        {username && (
          <div className="sidebar">
            <div className="logo">📈 TradeCrafters</div>
            <nav className="nav-links">
              <Link to="/" className="nav-link">🏠 Home</Link>
              <Link to="/portfolio" className="nav-link">📊 Portfolio</Link>
              <Link to="/trade" className="nav-link">💹 Trade</Link>
              <Link to="/history" className="nav-link">🕒 History</Link>
              <Link to="/analysis" className="nav-link">📈 Analysis</Link>
              {localStorage.getItem('role') === 'ADMIN' && (
                <Link to="/admin" className="nav-link">🛠️ Admin</Link>
              )}
            </nav>
            <div className="user-menu">
              <span className="nav-link">{username}</span>
              <button onClick={handleLogout} className="logout-button">Logout</button>
              <button
                onClick={handleDeleteAccount}
                className={`delete-button ${showDeleteConfirm ? 'confirm' : ''}`}
              >
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete Account'}
              </button>
            </div>
          </div>
        )}

        <div className="main-content">
          <Routes>
            <Route path="/login" element={
              username ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            } />

            <Route path="/" element={
              <ProtectedRoute>
                <div className="dashboard-layout">
                  <div className="card stock-data-card">
                    <h2 className="card-title">Stock Data</h2>
                    <p className="card-subtitle">Display real-time stock prices using an API (Alpha Vantage)</p>
                    <StockChart />
                  </div>

                  <div className="card portfolio-card">
                    <h2 className="card-title">Portfolio</h2>
                    <p className="card-subtitle">View owned stocks with quantity, average price, total value</p>
                    <p className="card-subtitle">Calculate total portfolio value (live)</p>
                    <Portfolio username={username} refreshTrigger={portfolioRefreshTrigger} />
                  </div>

                  <div className="card trading-card">
                    <h2 className="card-title">Trading</h2>
                    <p className="card-subtitle">Buy/Sell stocks</p>
                    <p className="card-subtitle">Order placement with price, quantity</p>
                    <p className="card-subtitle">Update user portfolio after each trade</p>
                    <TradeForm username={username} onTradeSuccess={triggerPortfolioRefresh} />
                  </div>

                  <div className="card transaction-history-card">
                    <h2 className="card-title">Transaction History</h2>
                    <p className="card-subtitle">Log all buy/sell operations</p>
                    <TransactionHistory username={username} />
                  </div>
                </div>
              </ProtectedRoute>
            } />

            <Route path="/portfolio" element={
              <ProtectedRoute>
                <Portfolio username={username} refreshTrigger={portfolioRefreshTrigger} />
              </ProtectedRoute>
            } />

            <Route path="/trade" element={
              <ProtectedRoute>
                <TradeForm username={username} onTradeSuccess={triggerPortfolioRefresh} />
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <TransactionHistory username={username} />
              </ProtectedRoute>
            } />

            <Route path="/analysis" element={
              <ProtectedRoute>
                <ProfileAnalysis username={username} />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                {localStorage.getItem('role') === 'ADMIN' ? <AdminDashboard /> : <Navigate to="/" />}
              </ProtectedRoute>
            } />
          </Routes>
          <footer className="footer">
            <div className="container">
              <p>&copy; {new Date().getFullYear()} TradeCrafters. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .app-container {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 250px;
          background-color: var(--secondary-bg);
          border-right: 1px solid var(--border-color);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          text-align: center;
        }

        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-grow: 1; /* Allows nav links to take up available space */
        }

        .nav-link {
          color: var(--text-primary);
          text-decoration: none;
          padding: 0.75rem 1rem;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .main-content {
          flex-grow: 1; /* Allows main content to take up remaining space */
          padding: 1rem;
        }

        .dashboard-layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Responsive grid */
          gap: 1rem;
        }

        .stock-data-card {
          grid-column: span 2; /* Stock Data spans two columns on larger screens */
        }

        .portfolio-card,
        .trading-card,
        .transaction-history-card {
          /* These will naturally fill available grid columns */
        }

        .user-menu {
          display: flex;
          flex-direction: column; /* Stack user menu items vertically */
          gap: 0.5rem;
          padding: 1rem 0; /* Add padding top and bottom */
          border-top: 1px solid var(--border-color);
          margin-top: auto; /* Pushes user menu to the bottom */
          align-items: center; /* Center align items in the column layout */
        }

        .user-menu span {
          font-weight: bold;
          margin-bottom: 0.5rem; /* Space between username and buttons */
          color: var(--text-primary);
        }

        .logout-button,
        .delete-button {
          width: 100%; /* Full width buttons */
          text-align: center;
        }

        .logout-button {
          background-color: var(--danger-color);
          padding: 0.5rem 1rem;
          font-size: 1rem;
        }
        .delete-button {
          background-color: var(--danger-color);
          padding: 0.5rem 1rem;
          font-size: 1rem;
          opacity: 0.8;
        }
        .delete-button.confirm {
          background-color: #ff0000;
          opacity: 1;
        }
        .delete-button:hover {
          opacity: 1;
        }

        .footer {
          margin-top: 2rem;
          padding: 1rem 0;
          background-color: var(--secondary-bg);
          border-top: 1px solid var(--border-color);
          text-align: center;
          position: relative;
          bottom: 0;
          width: 100%;
        }
        .footer p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }

        /* Add media queries for better responsiveness if needed */
        @media (max-width: 768px) {
          .app-container {
            flex-direction: column; /* Stack sidebar and main content on smaller screens */
          }
          .sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            flex-direction: row; /* Arrange sidebar items horizontally on small screens */
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 1rem;
          }
          .sidebar .nav-links {
             flex-direction: row;
             gap: 1rem;
             flex-grow: 0;
          }
           .sidebar .logo {
             margin-bottom: 0;
           }

          .dashboard-layout {
            grid-template-columns: 1fr; /* Single column layout on smaller screens */
          }
          .stock-data-card {
            grid-column: span 1; /* Stock Data spans one column on smaller screens */
          }

          .user-menu {
            flex-direction: row; /* Arrange user menu items horizontally on small screens */
            padding-top: 0;
            border-top: none;
            margin-top: 0;
            gap: 0.5rem;
          }
           .user-menu .nav-link {
             display: none; /* Hide username text on small screens if space is tight */
           }
           .user-menu button {
             width: auto; /* Auto width for buttons on small screens */
           }

            .user-menu span {
              display: inline-block; /* Show username span on small screens */
              margin-bottom: 0; /* Remove bottom margin on small screens */
              margin-right: 0.5rem; /* Add right margin to separate from buttons */
            }

            .user-menu {
              width: auto; /* Allow user menu to take required width on small screens */
              border-top: none;
              padding: 0;
              gap: 0.5rem;
            }

        }
      `}</style>
    </Router>
  );
}

export default App;
