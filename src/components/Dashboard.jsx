import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
import collateralIcon from '../assets/collateral.png';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [earningsRange, setEarningsRange] = useState('monthly');

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
    if (range === 'YTD' || range === 'This year') {
      fromDate = new Date(now.getFullYear(), 0, 1);
    } else if (range === '1W' || range === '1 week') {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
    } else if (range === '1M' || range === '1 month') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 1);
    } else if (range === '3M' || range === '3 months') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 3);
    } else if (range === '6M' || range === '6 months') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 6);
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

  // Helper: build earnings bar chart data
  function buildEarningsData(strategies, mode) {
    // Group by day, week, or month for the selected mode
    const now = new Date();
    let fromDate = null;
    if (mode === 'daily') {
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - 7);
    } else if (mode === 'weekly') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 3);
    } else if (mode === 'monthly') {
      fromDate = new Date(now);
      fromDate.setMonth(now.getMonth() - 12);
    }
    const filtered = strategies.filter(s => {
      if (!s.close_date) return false;
      const close = new Date(s.close_date);
      return !fromDate || (close >= fromDate && close <= now);
    });
    const earnings = {};
    const weekStartDates = {};
    filtered.forEach(s => {
      if (!s.close_date || typeof s.pnl !== 'number') return;
      const d = new Date(s.close_date);
      let label = '';
      if (mode === 'daily') {
        label = d.toLocaleDateString();
      } else if (mode === 'weekly') {
        // Get start date of ISO week
        const weekStart = getISOWeekStart(d);
        label = `${weekStart.getDate().toString().padStart(2, '0')} ${weekStart.toLocaleString('default', { month: 'short' })} ${weekStart.getFullYear().toString().slice(-2)}`;
        weekStartDates[label] = weekStart;
      } else {
        label = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      }
      if (!earnings[label]) earnings[label] = 0;
      earnings[label] += s.pnl;
    });
    // Sort labels chronologically
    let labels = Object.keys(earnings);
    if (mode === 'weekly') {
      labels = labels.sort((a, b) => weekStartDates[a] - weekStartDates[b]);
    } else if (mode === 'monthly') {
      labels = labels.sort((a, b) => {
        const [ma, ya] = a.split(' ');
        const [mb, yb] = b.split(' ');
        const da = new Date(`${ma} 1, 20${ya}`);
        const db = new Date(`${mb} 1, 20${yb}`);
        return da - db;
      });
    } else {
      labels = labels.sort((a, b) => new Date(a) - new Date(b));
    }
    const data = labels.map(l => earnings[l]);
    return { labels, data };
  }

  // Helper for ISO week start date
  function getISOWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  // Helper for ISO week number
  function getISOWeek(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }
      {/* Collateral Icon with Tooltip */}
      <div className="flex items-center mb-4">
        <div className="relative group">
          <img src={collateralIcon} alt="Collateral" className="w-7 h-7 mr-2" />
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-[#23272F] text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 border border-[#30363D]">collateral</span>
        </div>
      </div>

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

  // Earnings bar chart data
  const earningsBar = buildEarningsData(strategies, earningsRange);
  const earningsBarData = {
    labels: earningsBar.labels,
    datasets: [
      {
        label: 'Profit',
        data: earningsBar.data,
        backgroundColor: earningsBar.data.map(v => v >= 0 ? 'rgba(163, 230, 53, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };
  const earningsBarOptions = {
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `Profit: $${ctx.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#C9D1D9' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        ticks: { color: '#C9D1D9' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    }
  };

  // Placeholder investments donut chart
  const investmentsData = {
    labels: ['6 months', '12 months', '24 months'],
    datasets: [
      {
        data: [6251.68, 1096.79, 3619.39],
        backgroundColor: [
          'rgba(139, 92, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(253, 224, 71, 0.7)'
        ],
        borderWidth: 0,
      },
    ],
  };
  const investmentsOptions = {
    plugins: {
      legend: {
        labels: { color: '#C9D1D9', font: { size: 12 } },
        position: 'bottom',
      },
      title: { display: false },
    },
    cutout: '70%',
  };

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

  // Calculate current portfolio value and percent change for the selected range
  const filtered = filterByRange(strategies, selectedRange);
  const series = buildPortfolioSeries(filtered, initialCapital);
  const currentValue = series.length ? series[series.length - 1].value : initialCapital;
  const startValue = series.length ? series[0].value : initialCapital;
  const percentChange = startValue !== 0 ? ((currentValue - startValue) / startValue) * 100 : 0;

  // Dropdown options for filter
  const filterOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: 'This year', value: 'YTD' },
    { label: '1 week', value: '1W' },
    { label: '1 month', value: '1M' },
    { label: '3 months', value: '3M' },
  ];
  const earningsOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Portfolio Performance Card */}
      <div className="bg-[#161B22] rounded-2xl p-6 shadow-lg col-span-1 md:col-span-2 flex flex-col h-[420px] min-h-[320px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Portfolio performance</h2>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-emerald-200">${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={`text-base font-semibold ${currentValue - startValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {currentValue - startValue > 0 ? '+' : currentValue - startValue < 0 ? '-' : ''}${Math.abs(currentValue - startValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-semibold ${percentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%</span>
              {/* Collateral icon with tooltip */}
              <div className="relative group flex items-center">
                <img src={collateralIcon} alt="Collateral" className="w-6 h-6 ml-2" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-[#23272F] text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 border border-[#30363D]">collateral</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <button onClick={handleOpenPopup} className="text-gray-300 hover:text-emerald-400" title="Set Initial Capital">
              <span className="material-icons">settings</span>
            </button>
            <div className="relative">
              <button
                className="bg-[#23272F] text-gray-200 px-3 py-1 rounded flex items-center gap-2 border border-[#30363D] hover:bg-emerald-900"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {filterOptions.find(o => o.value === selectedRange)?.label || 'ALL'}
                <span className="material-icons text-base">expand_more</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-[#23272F] border border-[#30363D] rounded shadow-lg z-10">
                  {filterOptions.map(opt => (
                    <div
                      key={opt.value}
                      className={`px-4 py-2 cursor-pointer hover:bg-emerald-900 ${selectedRange === opt.value ? 'text-emerald-400' : 'text-gray-200'}`}
                      onClick={() => { setSelectedRange(opt.value); setDropdownOpen(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 w-full flex items-end">
          <Line options={{
            ...chartOptions,
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
              ...chartOptions.plugins,
              legend: { ...chartOptions.plugins.legend, align: 'start' },
            },
            layout: { padding: 0 },
          }}
          data={portfolioData}
          height={null}
          />
        </div>
      </div>

      {/* Investments Placeholder Card */}
      <div className="bg-[#161B22] rounded-2xl p-6 shadow-lg flex flex-col items-center">
        <h2 className="text-lg font-semibold text-white mb-2">Investments</h2>
        <div className="w-40 h-40 mx-auto">
          <Doughnut data={investmentsData} options={investmentsOptions} />
        </div>
        <div className="mt-4 w-full flex flex-col gap-1">
          <div className="flex justify-between text-xs text-gray-400"><span>6 months</span><span>$6,251.68</span></div>
          <div className="flex justify-between text-xs text-gray-400"><span>12 months</span><span>$1,096.79</span></div>
          <div className="flex justify-between text-xs text-gray-400"><span>24 months</span><span>$3,619.39</span></div>
        </div>
      </div>

      {/* Earnings Card */}
      <div className="bg-[#161B22] rounded-2xl p-6 shadow-lg flex flex-col h-[320px] min-h-[240px]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Earnings</h2>
          <div className="relative">
            <button
              className="bg-[#23272F] text-gray-200 px-3 py-1 rounded flex items-center gap-2 border border-[#30363D] hover:bg-emerald-900"
              onClick={() => setDropdownOpen(dropdownOpen === 'earnings' ? false : 'earnings')}
            >
              {earningsOptions.find(o => o.value === earningsRange)?.label || 'Monthly'}
              <span className="material-icons text-base">expand_more</span>
            </button>
            {dropdownOpen === 'earnings' && (
              <div className="absolute right-0 mt-2 w-36 bg-[#23272F] border border-[#30363D] rounded shadow-lg z-10">
                {earningsOptions.map(opt => (
                  <div
                    key={opt.value}
                    className={`px-4 py-2 cursor-pointer hover:bg-emerald-900 ${earningsRange === opt.value ? 'text-emerald-400' : 'text-gray-200'}`}
                    onClick={() => { setEarningsRange(opt.value); setDropdownOpen(false); }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold text-emerald-200">${earningsBar.data.reduce((a, b) => a + b, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span className="text-xs text-gray-400">USD</span>
        </div>
        <div className="flex-1 w-full flex items-end">
          <Bar options={{
            ...earningsBarOptions,
            maintainAspectRatio: false,
            responsive: true,
            layout: { padding: 0 },
          }}
          data={earningsBarData}
          height={null}
          />
        </div>
      </div>

      {/* Initial Capital Popup */}
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
