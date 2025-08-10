import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Portfolio({ username, refreshTrigger }) {
  const [portfolio, setPortfolio] = useState([]);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/portfolio/${username}`);
        setPortfolio(res.data.holdings);
        const total = res.data.totalValue;
        setTotalValue(total);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      }
    };
    fetchPortfolio();
  }, [username, refreshTrigger]);

  return (
    <div className="portfolio">
      <table>
        <thead>
          <tr>
            <th>Stock</th>
            <th>Quantity</th>
            <th>Avg. Price</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((item) => (
            <tr key={item.symbol}>
              <td>{item.symbol}</td>
              <td>{item.quantity}</td>
              <td>${parseFloat(item.avg_price).toFixed(2)}</td>
              <td>${parseFloat(item.total_value).toFixed(2)}</td>
            </tr>
          ))}
          {portfolio.length === 0 && (
            <tr>
              <td colSpan="4" className="no-portfolio">
                Your portfolio is empty.
              </td>
            </tr>
          )}
          <tr className="total-row">
            <td colSpan="3">Total</td>
            <td>${totalValue}</td>
          </tr>
        </tbody>
      </table>

      <style jsx>{`
        .portfolio {
          overflow-x: auto;
        }
        .total-row {
          font-weight: 600;
          border-top: 2px solid var(--border-color);
        }
        .total-row td {
          padding-top: 1rem;
        }
      `}</style>
    </div>
  );
}

export default Portfolio;
