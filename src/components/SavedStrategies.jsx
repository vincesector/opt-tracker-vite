import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabase'; // Import supabase client
import Select from './Select';
import Input from './Input';

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
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

  const loadStrategies = async () => {
    try {
      setLoading(true);
      setError(null);
      const savedStrategies = await storageService.getStrategies();
      setStrategies(savedStrategies);
    } catch (error) {
      console.error('Error loading strategies:', error);
      setError('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Initializing SavedStrategies component...');
    // Initial load will be done once subscription is ready

    // Set up real-time subscription
    const subscription = supabase
      .channel('strategies_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'strategies',
      }, (payload) => {
        console.log('Change received!', payload);
        // Add a small delay before reloading to ensure the database operation is complete
        setTimeout(() => {
          loadStrategies();
        }, 500); // 500ms delay
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Initial load once subscription is ready
          loadStrategies();
        }
      });

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const handleDelete = async (id) => {
    try {
      setError(null);
      await storageService.deleteStrategy(id);
      await loadStrategies(); // Reload the list after deletion
    } catch (error) {
      console.error('Error deleting strategy:', error);
      setError('Failed to delete strategy');
    }
  };

  const handleUpdate = async (id, updatedStrategy) => {
    try {
      setError(null);
      await storageService.updateStrategy(id, updatedStrategy);
      await loadStrategies(); // Reload the list after update
    } catch (error) {
      console.error('Error updating strategy:', error);
      setError('Failed to update strategy');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Asset',
      'Strategy',
      'Open Date',
      'Close Date',
      'Legs',
      'Total Contracts',
      'Net Premium',
      'Max Profit',
      'Max Loss',
      'Margin Used',
      'Entry Price',
      'Status',
      'P&L',
      'ROI'
    ];

    const csvContent = [
      headers.join(','),
      ...strategies.map(s => [
        s.asset,
        s.strategy_type,
        s.open_date,
        s.close_date,
        s.legs.length,
        s.legs.reduce((sum, leg) => sum + parseInt(leg.contracts), 0),
        s.net_premium,
        s.max_profit,
        s.max_loss,
        s.margin_required,
        s.asset_price,
        s.trade_outcome,
        s.pnl || '',
        s.roi ? s.roi.toFixed(2) + '%' : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'option_strategies.csv';
    link.click();
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex justify-center items-center h-32">
          <span className="text-[#8B949E]">Loading strategies...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex justify-center items-center h-32">
          <span className="text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]">
          <thead>
            <tr>
              <th className="table-header">Asset</th>
              <th className="table-header">Strategy</th>
              <th className="table-header">Open Date</th>
              <th className="table-header">Close Date</th>
              <th className="table-header">Legs</th>
              <th className="table-header text-right">Total Contracts</th>
              <th className="table-header text-right">Net Premium</th>
              <th className="table-header text-right">Max Profit</th>
              <th className="table-header text-right">Max Loss</th>
              <th className="table-header text-right">Margin Used</th>
              <th className="table-header text-right">Entry Price</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-right">P&L</th>
              <th className="table-header text-right">ROI</th>
              <th className="table-header text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((strategy) => (
              <tr key={strategy.id}>
                <td className="table-cell">{strategy.asset}</td>
                <td className="table-cell">{strategy.strategy_type}</td>
                <td className="table-cell">{formatDate(strategy.open_date)}</td>
                <td className="table-cell">{formatDate(strategy.close_date)}</td>
                <td className="table-cell">{strategy.legs.length}</td>
                <td className="table-cell text-right">
                  {strategy.legs.reduce((sum, leg) => sum + parseInt(leg.contracts), 0)}
                </td>
                <td className="table-cell text-right">${strategy.net_premium}</td>
                <td className="table-cell text-right">
                  {strategy.max_profit === 'Unlimited' ? 'Unlimited' : `$${strategy.max_profit}`}
                </td>
                <td className="table-cell text-right">
                  {strategy.max_loss === 'Unlimited' ? 'Unlimited' : `-$${Math.abs(strategy.max_loss)}`}
                </td>
                <td className="table-cell text-right">${strategy.margin_required}</td>
                <td className="table-cell text-right">${strategy.asset_price}</td>
                <td className="table-cell text-center">
                  <span className={`tag ${
                    strategy.trade_outcome === 'profit' ? 'tag-profit' :
                    strategy.trade_outcome === 'loss' ? 'tag-loss' :
                    'bg-[#30363D] text-[#8B949E]'
                  }`}>
                    {strategy.trade_outcome.charAt(0).toUpperCase() + strategy.trade_outcome.slice(1)}
                  </span>
                </td>
                <td className="table-cell text-right">
                  {strategy.trade_outcome !== 'pending' ? (
                    <span className={strategy.trade_outcome === 'loss' ? 'text-red-400' : 'text-green-400'}>
                      {strategy.trade_outcome === 'loss' ? '-' : ''}${Math.abs(strategy.pnl).toFixed(2)}
                    </span>
                  ) : ''}
                </td>
                <td className="table-cell text-right">
                  {strategy.trade_outcome === 'pending' ? (
                    <span className="text-[#8B949E]">
                      Max: {((strategy.max_profit / strategy.margin_required) * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className={strategy.trade_outcome === 'loss' ? 'text-red-400' : 'text-green-400'}>
                      {strategy.trade_outcome === 'loss' ? '-' : ''}{Math.abs(strategy.roi).toFixed(2)}%
                    </span>
                  )}
                </td>
                <td className="table-cell text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => setEditingStrategy(strategy)}
                      className="btn btn-secondary p-1"
                      title="Edit outcome"
                    >
                      <span className="material-icons text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="btn btn-danger p-1"
                      title="Delete strategy"
                    >
                      <span className="material-icons text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TradeOutcomePopup
        isOpen={!!editingStrategy}
        onClose={() => setEditingStrategy(null)}
        strategy={editingStrategy || {}}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default SavedStrategies;
