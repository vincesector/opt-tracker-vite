// Helper to calculate ROI for a strategy
const strategyRoi = (strategy) => {
  if (!strategy || !strategy.margin_required || strategy.margin_required === 0) return 0;
  if (typeof strategy.pnl !== 'number') return 0;
  return (strategy.pnl / strategy.margin_required) * 100;
};
import React, { useState, useEffect, useCallback } from 'react';
import collateralIcon from '../assets/collateral.png';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import Select from './Select';
import Input from './Input';
import { calculateStrategyMetrics } from '../utils/strategyCalculations';
import LoginPage from './LoginPage';
// Short date format: DD/MM/YY
const shortDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const TradeOutcomePopup = ({ isOpen, onClose, strategy, onUpdate }) => {
  const [outcome, setOutcome] = useState(strategy.trade_outcome);
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(strategy.id, {
      ...strategy,
      trade_outcome: outcome,
      pnl: outcome === 'pending' ? null : parseFloat(value) || 0,
      roi: outcome === 'pending' ? null : ((parseFloat(value) || 0) / parseFloat(strategy.margin_required)) * 100
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 w-96">
        <h3 id="dialog-title" className="text-lg font-semibold mb-4 text-emerald-400">Update Trade Outcome</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="trade-outcome" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Outcome</label>
            <Select
              id="trade-outcome"
              name="trade-outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="profit">Profit</option>
              <option value="loss">Loss</option>
            </Select>
          </div>

          {(outcome === 'profit' || outcome === 'loss') && (
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                {outcome === 'profit' ? 'Profit Amount ($)' : 'Loss Amount ($)'}
              </label>
              <Input
                type="number"
                id="amount"
                name="amount"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter amount"
                step="0.01"
                required
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SavedStrategies = () => {
  const [strategies, setStrategies] = useState([]);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialCapital, setInitialCapital] = useState(0);
  const [user, setUser] = useState(null);
  // Pagination state
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);


  // Load strategies from Supabase
  const loadStrategies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Only use storageService for strategies, not for initial capital
      const savedStrategies = await storageService.getStrategies();
      setStrategies(savedStrategies);
    } catch (err) {
      setError(err.message || 'Failed to load strategies');
    } finally {
      setLoading(false);
    }
  }, []);

  // Export strategies as CSV
  const handleExportCSV = () => {
    if (!strategies.length) return;
    const replacer = (key, value) => (value === null ? '' : value);
    const header = [
      'asset', 'strategy_type', 'open_date', 'close_date', 'legs', 'margin_required', 'asset_price',
      'max_profit', 'max_loss', 'net_premium', 'trade_outcome', 'pnl', 'roi', 'created_at', 'timestamp'
    ];
    const csv = [
      header.join(','),
      ...strategies.map(row =>
        header.map(fieldName => {
          if (fieldName === 'legs') {
            return '"' + JSON.stringify(row.legs) + '"';
          }
          return JSON.stringify(row[fieldName], replacer);
        }).join(',')
      )
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strategies.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Load user and initial capital from Supabase
  useEffect(() => {
    const getUserAndSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Load initial capital from user_settings
        const { data, error } = await supabase
          .from('user_settings')
          .select('initial_capital')
          .eq('user_id', user.id)
          .single();
        if (!error && data && data.initial_capital !== null) {
          setInitialCapital(data.initial_capital);
        } else {
          setInitialCapital(0);
        }
        loadStrategies();
      }
    };
    getUserAndSettings();
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        // Load initial capital for new session
        supabase
          .from('user_settings')
          .select('initial_capital')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data && data.initial_capital !== null) {
              setInitialCapital(data.initial_capital);
            } else {
              setInitialCapital(0);
            }
            loadStrategies();
          });
      }
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [loadStrategies]);

  const calculateTotalRoi = useCallback(() => {
    let totalPnl = 0;
    strategies.forEach(strategy => {
      if (strategy.trade_outcome !== 'pending') {
        totalPnl += strategy.pnl || 0;
      }
    });
    const initialCapitalValue = parseFloat(initialCapital);
    if (isNaN(initialCapitalValue) || initialCapitalValue === 0) {
      return 0;
    }
    return (totalPnl / initialCapitalValue) * 100;
  }, [strategies, initialCapital]);

  // Calculate user-specific stats from strategies
  const stats = React.useMemo(() => {
    let totalTrades = 0, wins = 0, losses = 0, totalPnL = 0, totalMarginUsed = 0;
    strategies.forEach(s => {
      totalTrades++;
      if (s.trade_outcome === 'profit') wins++;
      if (s.trade_outcome === 'loss') losses++;
      if (s.trade_outcome !== 'pending') totalPnL += s.pnl || 0;
      totalMarginUsed += s.margin_required ? Number(s.margin_required) : 0;
    });
    // Net P&L and ROI use initial capital
    const roi = initialCapital && initialCapital !== 0 ? (totalPnL / initialCapital) * 100 : 0;
    const currentCapital = initialCapital + totalPnL;
    return { totalTrades, wins, losses, totalPnL, totalMarginUsed, roi, currentCapital };
  }, [strategies, initialCapital]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="card p-4 mb-8 flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 md:space-x-4">
        <div className="flex flex-wrap gap-4 w-full justify-between items-center min-w-[900px]">
          <div className="flex items-center gap-2">
            <span className="material-icons text-blue-400">insights</span>
            <span className="text-[#8B949E] text-sm">Total Trades:</span>
            <span className="font-bold text-base">{stats.totalTrades}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-green-400">check_circle</span>
            <span className="text-[#8B949E] text-sm">Wins:</span>
            <span className="font-bold text-green-400 text-base">{stats.wins}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-red-400">cancel</span>
            <span className="text-[#8B949E] text-sm">Losses:</span>
            <span className="font-bold text-red-400 text-base">{stats.losses}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-yellow-400">account_balance_wallet</span>
            <span className="text-[#8B949E] text-sm">Total Margin Used:</span>
            <span className="font-bold text-base">{formatCurrency(stats.totalMarginUsed)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-cyan-400">account_balance</span>
            <span className="text-[#8B949E] text-sm">Current Capital:</span>
            <span className="font-bold text-base">{formatCurrency(stats.currentCapital)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-pink-400">trending_down</span>
            <span className="text-[#8B949E] text-sm">Net P&amp;L:</span>
            <span className={`font-bold text-base ${stats.totalPnL < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(stats.totalPnL)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-purple-400">percent</span>
            <span className="text-[#8B949E] text-sm">Overall ROI:</span>
            <span className={`font-bold text-base ${stats.roi < 0 ? 'text-red-400' : 'text-green-400'}`}>{stats.roi.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[#8B949E] text-xs">Initial Capital:</span>
            <span className="font-bold text-xs">{formatCurrency(initialCapital)}</span>
            <span className="relative group" style={{ minWidth: 0 }}>
              <span className="material-icons text-xs text-[#8B949E] cursor-pointer align-middle">help_outline</span>
              <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 bg-[#21262D] text-xs text-[#C9D1D9] px-2 py-1 rounded shadow-lg border border-[#30363D] opacity-0 group-hover:opacity-100 group-hover:delay-0 transition-opacity duration-100 pointer-events-none max-w-xs whitespace-normal break-words">
                Go to the Dashboard tab to edit your initial capital.
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-emerald-400 flex items-center">
            <span className="material-icons mr-2">history</span>
            Saved Strategies
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleExportCSV}
              className="btn btn-secondary text-xs py-1 px-2 flex items-center space-x-1"
            >
              <span className="material-icons text-sm">file_download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Initial capital input removed for compact display. Edit in Dashboard tab. */}

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-emerald-400">Total ROI: {calculateTotalRoi().toFixed(2)}%</h3>
        </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-xs text-gray-400">Rows per page:</label>
          <select
            id="rowsPerPage"
            className="bg-[#23272F] text-gray-200 px-2 py-1 rounded border border-[#30363D] text-xs"
            value={rowsPerPage}
            onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 text-xs rounded bg-[#23272F] border border-[#30363D] text-gray-200 disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Prev</button>
          <span className="text-xs text-gray-400">Page {page} of {Math.ceil(strategies.length / rowsPerPage) || 1}</span>
          <button
            className="px-2 py-1 text-xs rounded bg-[#23272F] border border-[#30363D] text-gray-200 disabled:opacity-50"
            onClick={() => setPage(p => Math.min(Math.ceil(strategies.length / rowsPerPage), p + 1))}
            disabled={page === Math.ceil(strategies.length / rowsPerPage) || strategies.length === 0}
          >Next</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr>
              <th className="table-header px-2">Asset</th>
              <th className="table-header px-2">Strat</th>
              <th className="table-header px-2">Open</th>
              <th className="table-header px-2">Close</th>
              <th className="table-header px-2">Legs</th>
              <th className="table-header px-2 text-right">Contracts</th>
              <th className="table-header px-2 text-right">Premium</th>
              <th className="table-header px-2 text-right">Profit</th>
              <th className="table-header px-2 text-right">Loss</th>
              <th className="table-header px-2 text-right">Margin</th>
              <th className="table-header px-2 text-right">Entry</th>
              <th className="table-header px-2 text-center">Status</th>
              <th className="table-header px-2 text-right">P&L</th>
              <th className="table-header px-2 text-right">ROI</th>
              <th className="table-header px-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>*:nth-child(even)]:bg-gray-850">
            {strategies.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((strategy) => {
              const strategyRoiValue = strategyRoi(strategy);
              return (
                <tr key={strategy.id} className="hover:bg-gray-700">
                  <td className="table-cell py-2 px-2">{strategy.asset}</td>
                  <td className="table-cell py-2 px-2">{strategy.strategy_type}</td>
                  <td className="table-cell py-2 px-2">{shortDate(strategy.open_date)}</td>
                  <td className="table-cell py-2 px-2">{shortDate(strategy.close_date)}</td>
                  <td className="table-cell py-2 px-2">{strategy.legs.length}</td>
                  <td className="table-cell py-2 px-2 text-right">
                    {strategy.legs.reduce((sum, leg) => sum + parseInt(leg.contracts), 0)}
                  </td>
                  <td className="table-cell py-2 px-2 text-right">${strategy.net_premium}</td>
                  <td className="table-cell py-2 px-2 text-right">
                    {strategy.max_profit === 'Unlimited' ? 'Unl.' : `$${strategy.max_profit}`}
                  </td>
                  <td className="table-cell py-2 px-2 text-right">
                    {strategy.max_loss === 'Unlimited' ? 'Unl.' : `-$${Math.abs(strategy.max_loss)}`}
                  </td>
                  <td className="table-cell py-2 px-2 text-right">${strategy.margin_required}</td>
                  <td className="table-cell py-2 px-2 text-right">${strategy.asset_price}</td>
                  <td className="table-cell py-2 px-2 text-center">
                    <span className={`tag ${strategy.trade_outcome === 'profit' ? 'tag-profit' : strategy.trade_outcome === 'loss' ? 'tag-loss' : 'bg-[#30363D] text-[#8B949E]'}`}>
                      {strategy.trade_outcome.charAt(0).toUpperCase() + strategy.trade_outcome.slice(1)}
                    </span>
                  </td>
                  <td className="table-cell py-2 px-2 text-right">
                    {strategy.trade_outcome !== 'pending' ? (
                      <span className={strategy.trade_outcome === 'loss' ? 'text-red-400' : 'text-green-400'}>
                        {strategy.trade_outcome === 'loss' ? '-' : ''}${Math.abs(strategy.pnl).toFixed(2)}
                      </span>
                    ) : ''}
                  </td>
                  <td className="table-cell py-2 px-2 text-right">
                    {strategy.trade_outcome === 'pending' ? (
                      <span className="text-[#8B949E]">
                        Max: {((strategy.max_profit / strategy.margin_required) * 100).toFixed(2)}%
                      </span>
                    ) : (
                      <span className={strategy.trade_outcome === 'loss' ? 'text-red-400' : 'text-green-400'}>
                        {strategy.trade_outcome === 'loss' ? '-' : ''}{strategyRoiValue ? strategyRoiValue.toFixed(2) : 0}%
                      </span>
                    )}
                  </td>
                  <td className="table-cell py-2 px-2 text-center">
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => setEditingStrategy(strategy)}
                        className="btn btn-secondary p-1"
                        title="Edit outcome"
                      >
                        <span className="material-icons text-sm">edit</span>
                      </button>
                      <button
                        onClick={async () => {
                          await storageService.deleteStrategy(strategy.id);
                          setStrategies(strategies.filter(s => s.id !== strategy.id));
                        }}
                        className="btn btn-danger p-1"
                        title="Delete strategy"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                  <td className="table-cell py-2 px-2 text-center">
                    <div className="flex items-center justify-center">
                      <div className="relative group">
                        <img src={collateralIcon} alt="Collateral" className="w-6 h-6" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-[#23272F] text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 border border-[#30363D]">collateral</span>
                      </div>
                      <span className="ml-2 text-xs text-gray-400">{strategy.collateral || 'BTC'}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TradeOutcomePopup
        isOpen={!!editingStrategy}
        onClose={() => setEditingStrategy(null)}
        strategy={editingStrategy || {}}
        onUpdate={async (id, updatedStrategy) => {
          // Update strategy in Supabase and reload
          try {
            await supabase
              .from('strategies')
              .update(updatedStrategy)
              .eq('id', id);
            loadStrategies();
          } catch (err) {
            setError('Failed to update strategy');
          }
        }}
      />
    </div>
      </>
  );
}

export default SavedStrategies;
