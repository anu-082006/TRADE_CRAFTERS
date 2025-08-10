import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({ total_users: 0, total_trades: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to format date
  const formatTradeDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Use 24-hour format
      };
      return date.toLocaleString('en-US', options);
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users/admin/stats', getAuthHeaders());
      setStats(res.data);
    } catch (err) {
      setError('Failed to fetch stats');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/users/admin/users', getAuthHeaders());
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setPortfolio([]);
    setTrades([]);
    try {
      const [portfolioRes, tradesRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/users/admin/user/${user.user_id}/portfolio`, getAuthHeaders()),
        axios.get(`http://localhost:5000/api/users/admin/user/${user.user_id}/trades`, getAuthHeaders())
      ]);
      setPortfolio(portfolioRes.data);
      setTrades(tradesRes.data);
    } catch (err) {
      setError('Failed to fetch user data');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.post(`http://localhost:5000/api/users/admin/user/${user.user_id}/toggle-active`, {}, getAuthHeaders());
      fetchUsers();
      if (selectedUser && selectedUser.user_id === user.user_id) {
        setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active });
      }
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, usernameToDelete) => {
    if (!window.confirm(`Are you sure you want to delete user ${usernameToDelete}? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await axios.delete(`http://localhost:5000/api/users/admin/user/${userId}`, getAuthHeaders());
      if (res.data.success) {
        alert(res.data.message);
        fetchUsers(); // Refresh the user list
        setSelectedUser(null); // Clear selected user details if it was the one deleted
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <div className="admin-stats">
        <h3>System Statistics</h3>
        <p>Total Users: {stats.total_users}</p>
        <p>Total Trades: {stats.total_trades}</p>
      </div>
      <div className="admin-users">
        <h3>All Users</h3>
        {loading ? <p>Loading users...</p> : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.user_id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.is_active ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => handleSelectUser(user)}>View</button>
                    <button onClick={() => handleDeleteUser(user.user_id, user.username)} className="delete-user-button">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedUser && (
        <div className="admin-user-details">
          <h3>User Details: {selectedUser.username}</h3>
          <h4>Portfolio</h4>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Avg. Price</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.symbol}</td>
                  <td>{item.quantity}</td>
                  <td>{item.avg_price}</td>
                </tr>
              ))}
              {portfolio.length === 0 && <tr><td colSpan="3">No holdings</td></tr>}
            </tbody>
          </table>
          <h4>Trade History</h4>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={idx}>
                  <td>{trade.type}</td>
                  <td>{trade.symbol}</td>
                  <td>{trade.quantity}</td>
                  <td>{trade.price_per_share}</td>
                  <td>{formatTradeDate(trade.transaction_time)}</td>
                </tr>
              ))}
              {trades.length === 0 && <tr><td colSpan="5">No trades</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default AdminDashboard; 