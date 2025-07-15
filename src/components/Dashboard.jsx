import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Input from './Input';
// import { storageService } from '../services/storageService';
import { supabase, db } from '../services/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [initialCapital, setInitialCapital] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [userId, setUserId] = useState(null);
  const [portfolioData, setPortfolioData] = useState({ labels: [], datasets: [] });
  const [strategies, setStrategies] = useState([]);
  const [selectedRange, setSelectedRange] = useState('ALL');

  useEffect(() => {
    // Get current user, initial capital, and strategies
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch initial capital from user_settings table
        const { data, error } = await supabase
          .from('user_settings')
          .select('initial_capital')
          .eq('user_id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching initial capital:', error);
        }
        setInitialCapital(data?.initial_capital || 0);
        // Fetch strategies
        const userStrategies = await db.strategies.getAll();
        setStrategies(userStrategies);
      }
    };
    fetchData();
  }, []);

  // Helper: filter strategies by selected range
  function filterByRange(strategies, range) {
    const now = new Date();
    let fromDate = null;
    if (range === 'YTD') {
      fromDate = new Date(now.getFullYear(), 0, 1);
    } else if (range === '1W') {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
    } else if (range === '1M') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 1);
    } else if (range === '3M') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 3);
    }
    if (!fromDate) return strategies;
    return strategies.filter(s => {
      if (!s.close_date) return false;
      const close = new Date(s.close_date);
      return close >= fromDate && close <= now;
    });
  }

  // Helper: build portfolio value time series
  function buildPortfolioSeries(strategies, initialCapital) {
    // Only use closed trades (with close_date and pnl)
    const closed = strategies
      .filter(s => s.close_date && typeof s.pnl === 'number')
      .sort((a, b) => new Date(a.close_date) - new Date(b.close_date));
    let value = Number(initialCapital) || 0;
    const points = [];
    // Add initial point
    if (closed.length === 0) {
      points.push({ date: new Date(), value });
    } else {
      points.push({ date: new Date(closed[0].close_date), value });
    }
    closed.forEach(s => {
      value += s.pnl;
      points.push({ date: new Date(s.close_date), value });
    });
    return points;
  }

  // Update chart data when strategies, initialCapital, or selectedRange changes
  useEffect(() => {
    if (!strategies) return;
    const filtered = filterByRange(strategies, selectedRange);
    const series = buildPortfolioSeries(filtered, initialCapital);
    const labels = series.map(p => p.date.toLocaleDateString());
    const data = series.map(p => p.value);
    setPortfolioData({
      labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false,
        },
      ],
    });
  }, [strategies, initialCapital, selectedRange]);

  const handleOpenPopup = () => {
    setInputValue(initialCapital);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handlePopupSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value > 0) {
      // Upsert initial capital to user_settings table
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, initial_capital: value }, { onConflict: 'user_id' });
      if (error) {
        console.error('Error saving initial capital:', error);
        return;
      }
      setInitialCapital(value);
      setShowPopup(false);
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Portfolio Performance',
        color: '#C9D1D9'
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#C9D1D9'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: '#C9D1D9'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-emerald-400">Dashboard</h1>
        <button onClick={handleOpenPopup} className="text-gray-300 hover:text-emerald-400" title="Set Initial Capital">
          <span className="material-icons">settings</span>
        </button>
      </div>
      <p className="text-gray-400">Welcome to your dashboard!</p>

      <div className="mb-4">
        <span className="text-lg text-emerald-400">Initial Capital: ${initialCapital}</span>
      </div>

      <div className="flex gap-2 mb-4">
        {['ALL', 'YTD', '1W', '1M', '3M'].map(range => (
          <button
            key={range}
            className={`px-3 py-1 rounded text-sm font-medium border transition-colors duration-150 ${selectedRange === range ? 'bg-emerald-400 text-black border-emerald-400' : 'bg-[#161B22] text-gray-300 border-[#30363D] hover:bg-emerald-900'}`}
            onClick={() => setSelectedRange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="chart-container">
        <Line options={chartOptions} data={portfolioData} />
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-emerald-400">Set Initial Capital</h3>
            <form onSubmit={handlePopupSubmit} className="space-y-4">
              <Input
                type="number"
                id="initialCapitalPopup"
                className="input-field"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Enter initial capital"
                step="0.01"
                required
              />
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={handleClosePopup} className="btn btn-secondary px-4 py-2">Cancel</button>
                <button type="submit" className="btn btn-primary px-4 py-2">OK</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
