import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const TradeOutcomePopup = ({ isOpen, onClose, strategy, onUpdate }) => {
  const [outcome, setOutcome] = useState(strategy.tradeOutcome);
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(strategy.timestamp, {
      ...strategy,
      tradeOutcome: outcome,
      pnl: outcome === 'pending' ? null : parseFloat(value) || 0,
      roi: outcome === 'pending' ? null : ((parseFloat(value) || 0) / parseFloat(strategy.marginRequired)) * 100
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4 text-emerald-400">Update Trade Outcome</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#C9D1D9]">Outcome</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="select-field"
            >
              <option value="pending">Pending</option>
              <option value="profit">Profit</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </div>
          
          {(outcome === 'profit' || outcome === 'loss') && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                {outcome === 'profit' ? 'Profit Amount ($)' : 'Loss Amount ($)'}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter amount"
                step="0.01"
                className="input-field"
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

  useEffect(() => {
    const loadStrategies = () => {
      try {
        const savedStrategies = storageService.getStrategies();
        setStrategies(savedStrategies);
      } catch (error) {
        console.error('Error loading strategies:', error);
        // TODO: Show error notification to user
      }
    };

    loadStrategies();
    // Listen for storage changes
    window.addEventListener('strategiesUpdated', (e) => setStrategies(e.detail));
    return () => window.removeEventListener('strategiesUpdated', (e) => setStrategies(e.detail));
  }, []);

  const handleDelete = (timestamp) => {
    try {
      const index = strategies.findIndex(s => s.timestamp === timestamp);
      if (index !== -1) {
        storageService.deleteStrategy(index);
        setStrategies(storageService.getStrategies());
      }
    } catch (error) {
      console.error('Error deleting strategy:', error);
      // TODO: Show error notification to user
    }
  };

  const handleUpdate = (timestamp, updatedStrategy) => {
    try {
      const index = strategies.findIndex(s => s.timestamp === timestamp);
      if (index !== -1) {
        storageService.updateStrategy(index, updatedStrategy);
        setStrategies(storageService.getStrategies());
      }
    } catch (error) {
      console.error('Error updating strategy:', error);
      // TODO: Show error notification to user
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
        s.strategyType,
        s.openDate,
        s.closeDate,
        s.legs.length,
        s.legs.reduce((sum, leg) => sum + parseInt(leg.contracts), 0),
        s.netPremium,
        s.maxProfit,
        s.maxLoss,
        s.marginRequired,
        s.assetPrice,
        s.tradeOutcome,
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
              <tr key={strategy.timestamp}>
                <td className="table-cell">{strategy.asset}</td>
                <td className="table-cell">{strategy.strategyType}</td>
                <td className="table-cell">{strategy.openDate}</td>
                <td className="table-cell">{strategy.closeDate}</td>
                <td className="table-cell">{strategy.legs.length}</td>
                <td className="table-cell text-right">
                  {strategy.legs.reduce((sum, leg) => sum + parseInt(leg.contracts), 0)}
                </td>
                <td className="table-cell text-right">${strategy.netPremium}</td>
                <td className="table-cell text-right">
                  {strategy.maxProfit === 'Unlimited' ? 'Unlimited' : `$${strategy.maxProfit}`}
                </td>
                <td className="table-cell text-right">
                  {strategy.maxLoss === 'Unlimited' ? 'Unlimited' : `-$${Math.abs(strategy.maxLoss)}`}
                </td>
                <td className="table-cell text-right">${strategy.marginRequired}</td>
                <td className="table-cell text-right">${strategy.assetPrice}</td>
                <td className="table-cell text-center">
                  <span className={`tag ${
                    strategy.tradeOutcome === 'profit' ? 'tag-profit' :
                    strategy.tradeOutcome === 'loss' ? 'tag-loss' :
                    'bg-[#30363D] text-[#8B949E]'
                  }`}>
                    {strategy.tradeOutcome.charAt(0).toUpperCase() + strategy.tradeOutcome.slice(1)}
                  </span>
                </td>
                <td className="table-cell text-right">
                  {strategy.tradeOutcome !== 'pending' ? (
                    <span className={strategy.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      ${Math.abs(strategy.pnl).toFixed(2)}
                    </span>
                  ) : ''}
                </td>
                <td className="table-cell text-right">
                  {strategy.tradeOutcome === 'pending' ? (
                    <span className="text-[#8B949E]">
                      Max: {((strategy.maxProfit / strategy.marginRequired) * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span className={strategy.roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {strategy.roi.toFixed(2)}%
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
                      onClick={() => handleDelete(strategy.timestamp)}
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
