import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

function ProfileAnalysis({ username }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/analysis/${username}`);
        setAnalysisData(res.data);
        setError('');
      } catch (error) {
        console.error('Error fetching profile analysis:', error);
        setError('Failed to load profile analysis data.');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchAnalysis();
    }
  }, [username]);

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    // Save original styles
    const originalBg = reportRef.current.style.backgroundColor;
    const table = reportRef.current.querySelector('table');
    const originalTableColor = table ? table.style.color : '';
    const originalTableBg = table ? table.style.backgroundColor : '';

    // Set white background and black text for table
    reportRef.current.style.backgroundColor = '#fff';
    if (table) {
      table.style.color = '#000';
      table.style.backgroundColor = '#fff';
      // Also set all td and th
      table.querySelectorAll('td, th').forEach(cell => {
        cell.style.color = '#000';
        cell.style.backgroundColor = '#fff';
      });
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`TradeCrafters_Analysis_${username}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      // Restore original styles
      reportRef.current.style.backgroundColor = originalBg;
      if (table) {
        table.style.color = originalTableColor;
        table.style.backgroundColor = originalTableBg;
        table.querySelectorAll('td, th').forEach(cell => {
          cell.style.color = '';
          cell.style.backgroundColor = '';
        });
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading analysis...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!analysisData || !analysisData.holdings) {
    return <div className="no-data">No analysis data available.</div>;
  }

  return (
    <div className="profile-analysis">
      <div className="analysis-header">
        <h2>Profile Analysis for {username}</h2>
        <button onClick={downloadPDF} className="download-button">
          Download PDF Report
        </button>
      </div>

      <div ref={reportRef} className="analysis-content">
        {/* Trading Activity Summary */}
        {analysisData.tradingActivitySummary && (
          <div className="summary-card card">
            <h3>Trading Activity Summary</h3>
            <p>Total Trades: {analysisData.tradingActivitySummary.totalTrades}</p>
            <p>Buys: {analysisData.tradingActivitySummary.buys}</p>
            <p>Sells: {analysisData.tradingActivitySummary.sells}</p>
            <p>Most Traded Stock: {analysisData.tradingActivitySummary.mostTradedStock}</p>
            {/* Average Holding Period is omitted for now */}
          </div>
        )}

        {/* Portfolio Summary */}
        <div className="summary-card card">
          <h3>Portfolio Summary</h3>
          <p>Total Portfolio Value: ${analysisData.totalPortfolioValue}</p>
          {/* Add more summary info here later if needed */}
        </div>

        <h3>Holdings Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Quantity</th>
              <th>Avg. Price</th>
              <th>Current Price</th>
              <th>Current Value</th>
              <th>Unrealized Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {analysisData.holdings.map((holding, index) => (
              <tr key={index}>
                <td>{holding.symbol}</td>
                <td>{holding.quantity}</td>
                <td>${holding.avgPrice.toFixed(2)}</td>
                <td>{holding.currentPrice !== 'N/A' ? `$${holding.currentPrice}` : 'N/A'}</td>
                <td>{holding.currentValue !== 'N/A' ? `$${holding.currentValue}` : 'N/A'}</td>
                <td>{holding.unrealizedGainLoss !== 'N/A' ? `$${holding.unrealizedGainLoss}` : 'N/A'}</td>
              </tr>
            ))}
            {analysisData.holdings.length === 0 && (
              <tr>
                <td colSpan="6" className="no-holdings">
                  No stock holdings to analyze.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Portfolio Growth Chart */}
        {analysisData.portfolioGrowth && analysisData.portfolioGrowth.length > 1 && (
          <div className="chart-container card">
            <h3>Portfolio Growth Over Time</h3>
            <Line
              data={{
                labels: analysisData.portfolioGrowth.map(dataPoint => new Date(dataPoint.time).toLocaleDateString()),
                datasets: [
                  {
                    label: 'Portfolio Value',
                    data: analysisData.portfolioGrowth.map(dataPoint => parseFloat(dataPoint.value)),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false,
                    text: 'Portfolio Value Over Time',
                  },
                },
                 scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Date',
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Value ($)',
                    },
                  },
                },
              }}
            />
          </div>
        )}

        {/* Sector Distribution Chart */}
        {analysisData.sectorDistribution && analysisData.sectorDistribution.length > 0 && (
          <div className="chart-container card">
            <h3>Sector Distribution</h3>
            <Pie
              data={{
                labels: analysisData.sectorDistribution.map(item => item.sector),
                datasets: [
                  {
                    data: analysisData.sectorDistribution.map(item => item.value),
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.8)',
                      'rgba(54, 162, 235, 0.8)',
                      'rgba(255, 206, 86, 0.8)',
                      'rgba(75, 192, 192, 0.8)',
                      'rgba(153, 102, 255, 0.8)',
                      'rgba(255, 159, 64, 0.8)',
                      'rgba(199, 199, 199, 0.8)',
                      'rgba(83, 102, 255, 0.8)',
                      'rgba(40, 159, 64, 0.8)',
                      'rgba(210, 199, 199, 0.8)',
                    ],
                    borderColor: [
                      'rgba(255, 99, 132, 1)',
                      'rgba(54, 162, 235, 1)',
                      'rgba(255, 206, 86, 1)',
                      'rgba(75, 192, 192, 1)',
                      'rgba(153, 102, 255, 1)',
                      'rgba(255, 159, 64, 1)',
                      'rgba(199, 199, 199, 1)',
                      'rgba(83, 102, 255, 1)',
                      'rgba(40, 159, 64, 1)',
                      'rgba(210, 199, 199, 1)',
                    ],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value.toFixed(2)}%`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
        )}

        {/* Insights & Recommendations Panel */}
        <div className="insights-panel card">
          <h3>Insights & Recommendations</h3>
          <div className="insights-content">
            {/* Trading Activity Insights */}
            {analysisData.tradingActivitySummary && (
              <>
                {analysisData.tradingActivitySummary.totalTrades > 10 && (
                  <div className="insight-item">
                    <span className="insight-icon">📊</span>
                    <p>High trading activity detected. Consider reviewing your trading strategy for potential optimization.</p>
                  </div>
                )}
                {analysisData.tradingActivitySummary.buys > analysisData.tradingActivitySummary.sells * 2 && (
                  <div className="insight-item">
                    <span className="insight-icon">💰</span>
                    <p>You're buying more than selling. Consider rebalancing your portfolio if needed.</p>
                  </div>
                )}
              </>
            )}

            {/* Portfolio Performance Insights */}
            {analysisData.holdings && analysisData.holdings.length > 0 && (
              <>
                {analysisData.holdings.some(h => parseFloat(h.unrealizedGainLoss) > 0) && (
                  <div className="insight-item">
                    <span className="insight-icon">📈</span>
                    <p>Some of your holdings are showing positive returns. Consider reviewing your exit strategy.</p>
                  </div>
                )}
                {analysisData.holdings.some(h => parseFloat(h.unrealizedGainLoss) < 0) && (
                  <div className="insight-item">
                    <span className="insight-icon">📉</span>
                    <p>Some positions are in the red. Review these holdings and consider your risk management strategy.</p>
                  </div>
                )}
              </>
            )}

            {/* Realized Gains/Losses Insights */}
            {analysisData.realizedGainsLosses && analysisData.realizedGainsLosses.length > 0 && (
              <>
                {analysisData.realizedGainsLosses.some(r => parseFloat(r.realizedGainLoss) > 0) && (
                  <div className="insight-item">
                    <span className="insight-icon">🎯</span>
                    <p>You've made some profitable trades. Consider analyzing what worked well.</p>
                  </div>
                )}
                {analysisData.realizedGainsLosses.some(r => parseFloat(r.realizedGainLoss) < 0) && (
                  <div className="insight-item">
                    <span className="insight-icon">⚠️</span>
                    <p>Some trades resulted in losses. Review these trades to improve your strategy.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Realized Gains/Losses */}
        {analysisData.realizedGainsLosses && analysisData.realizedGainsLosses.length > 0 && (
          <div className="realized-gl-section">
            <h3>Realized Gains/Losses</h3>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity Sold</th>
                  <th>Avg. Buy Price</th>
                  <th>Sell Price</th>
                  <th>Realized Gain/Loss</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.realizedGainsLosses.map((item, index) => (
                  <tr key={index}>
                    <td>{item.symbol}</td>
                    <td>{item.quantitySold}</td>
                    <td>${parseFloat(item.avgBuyPriceAtSale).toFixed(2)}</td>
                    <td>${parseFloat(item.sellPrice).toFixed(2)}</td>
                    <td style={{ color: parseFloat(item.realizedGainLoss) >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      ${parseFloat(item.realizedGainLoss).toFixed(2)}
                    </td>
                    <td>{new Date(item.transactionTime).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add styles for this component */}
      <style jsx>{`
        .profile-analysis {
          margin-top: 1rem;
        }
        .analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .download-button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        .download-button:hover {
          background-color: var(--primary-color-dark);
        }
        .analysis-content {
          background-color: var(--bg-color);
          padding: 2rem;
          border-radius: 8px;
        }
        .summary-card {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: var(--secondary-bg);
          border-radius: 8px;
        }
        .summary-card h3 {
          margin-top: 0;
          color: var(--text-primary);
        }
         table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        th {
          background-color: var(--secondary-bg);
          font-weight: 600;
        }
         .no-holdings {
          text-align: center;
          color: var(--text-secondary);
          font-style: italic;
        }
        .loading, .error-message, .no-data {
           text-align: center;
           padding: 1rem;
        }
         .error-message {
           color: var(--danger-color);
           background-color: rgba(248, 81, 73, 0.1);
           border-radius: 4px;
         }

        .insights-panel {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: var(--secondary-bg);
          border-radius: 8px;
        }

        .insights-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .insight-icon {
          font-size: 1.5rem;
        }

        .insight-item p {
          margin: 0;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .chart-container {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: var(--secondary-bg);
          border-radius: 8px;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .chart-container h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

export default ProfileAnalysis; 