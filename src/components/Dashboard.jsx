import React, { useState, useEffect, useCallback } from 'react';
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
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabase';

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
  const [portfolioData, setPortfolioData] = useState({
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'],
    datasets: [
      {
        label: 'Portfolio Value',
        data: [12000, 12500, 12300, 13000, 12800, 13200],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      },
    ],
  });

  useEffect(() => {
    // Get current user and initial capital from Supabase
    const fetchUserAndCapital = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const capital = await storageService.getInitialCapital(user.id);
        setInitialCapital(capital || 0);
      }
    };
    fetchUserAndCapital();
    // Fetch portfolio performance data from the database here
    // and update the portfolioData state
  }, []);

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
      await storageService.setInitialCapital(userId, value);
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
