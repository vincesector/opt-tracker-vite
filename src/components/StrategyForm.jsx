import React, { useState, useEffect, useRef } from 'react';
import Select from './Select';
import Input from './Input';
import DatePicker from './DatePicker';
import Leg from './Leg';
import { calculateStrategyMetrics } from '../utils/strategyCalculations';
import { initChart, updatePayoffChart } from '../utils/chartUtils';
import { storageService } from '../services/storageService';

/**
 * Detects the type of option strategy based on the legs provided.
 * @param {Array<import('./Leg').LegValues>} legs - An array of leg objects.
 * @returns {string} The detected strategy type (e.g., 'Covered Call', 'Long Call', 'Custom').
 */
const detectStrategyType = (legs) => {
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.action === 'Buy' && leg.type === 'Call') return 'Long Call';
    if (leg.action === 'Buy' && leg.type === 'Put') return 'Long Put';
    if (leg.action === 'Sell' && leg.type === 'Call') return 'Covered Call';
    if (leg.action === 'Sell' && leg.type === 'Put') return 'Cash Secured Put';
  }
  if (legs.length === 2) {
    const [leg1, leg2] = legs;
    if (leg1.type === leg2.type) {
      if (leg1.type === 'Call') {
        return (leg1.action === 'Buy' && leg2.action === 'Sell') ? 'Call Debit Spread' : 'Call Credit Spread';
      }
      if (leg1.type === 'Put') {
        return (leg1.action === 'Buy' && leg2.action === 'Sell') ? 'Put Debit Spread' : 'Put Credit Spread';
      }
    }
    if (leg1.type !== leg2.type && leg1.strike === leg2.strike) {
      return 'Straddle';
    }
    if (leg1.type !== leg2.type && leg1.strike !== leg2.strike) {
      return 'Strangle';
    }
  }
  if (legs.length === 4) {
    return 'Iron Condor';
  }
  return 'Custom';
};

/**
 * @typedef {object} StrategyMetrics
 * @property {number} netPremium - The net premium received or paid.
 * @property {number} maxProfit - The maximum potential profit.
 * @property {number} maxLoss - The maximum potential loss.
 * @property {number[]} breakevens - An array of breakeven points.
 * @property {number} probProfit - The probability of profit (as a percentage).
 * @property {number} roi - The Return on Investment (as a percentage).
 */

/**
 * The main component for the Option Strategy Tracker form.
 * Manages the state of the option legs, calculates strategy metrics, and updates the payoff chart.
 * @returns {JSX.Element}
 */
const StrategyForm = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [legs, setLegs] = useState([{ id: 1 }]);
  const [legData, setLegData] = useState({ 1: { action: 'Sell', type: 'Call', strike: '', premium: '', contracts: 1 } });
  const [strategyType, setStrategyType] = useState('');
  const [metrics, setMetrics] = useState({
    netPremium: 0,
    maxProfit: 0,
    maxLoss: 0,
    breakevens: [],
    probProfit: 0,
    roi: 0
  });
  const [tradeOutcome, setTradeOutcome] = useState('pending');

  /**
   * Adds a new leg to the strategy, up to a maximum of 4 legs.
   */
  const addLeg = () => {
    if (legs.length < 4) {
      const newId = legs.length + 1;
      setLegs([...legs, { id: newId }]);
      setLegData(prev => ({
        ...prev,
        [newId]: { action: 'Buy', type: 'Call', strike: '', premium: '', contracts: 1 }
      }));
    }
  };

  /**
   * Removes a leg from the strategy.
   * @param {string | number} legId - The ID of the leg to remove.
   */
  const removeLeg = (legId) => {
    if (legs.length > 1) {
      setLegs(legs.filter(leg => leg.id !== legId));
      setLegData(prev => {
        const newData = { ...prev };
        delete newData[legId];
        return newData;
      });
    }
  };

  /**
   * Handles changes to a specific leg's values.
   * Updates the leg data and recalculates strategy metrics.
   * @param {string | number} id - The ID of the leg that changed.
   * @param {import('./Leg').LegValues} values - The new values for the leg.
   */
  const handleLegChange = (id, values) => {
    setLegData(prev => {
      const newLegData = {
        ...prev,
        [id]: values
      };
      // Recalculate metrics whenever leg data changes
      const assetPrice = document.getElementById('asset-price')?.value;
      const marginRequired = document.getElementById('margin-required')?.value;
      const newMetrics = calculateStrategyMetrics(Object.values(newLegData), parseFloat(assetPrice), parseFloat(marginRequired));
      setMetrics(newMetrics);
      return newLegData;
    });
  };

  /**
   * Handles changes to the asset price input.
   * Recalculates strategy metrics based on the new asset price.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleAssetPriceChange = (e) => {
    const assetPrice = parseFloat(e.target.value);
    const marginRequired = document.getElementById('margin-required')?.value;
    const newMetrics = calculateStrategyMetrics(Object.values(legData), assetPrice, parseFloat(marginRequired));
    setMetrics(newMetrics);
  };

  /**
   * Effect hook to initialize the chart when the component mounts.
   */
  useEffect(() => {
    if (chartRef.current && !chartInstanceRef.current) {
      chartInstanceRef.current = initChart(chartRef.current);
    }
  }, []);

  /**
   * Effect hook to update the chart whenever leg data or metrics change.
   */
  useEffect(() => {
    if (Object.keys(legData).length > 0) {
      setStrategyType(detectStrategyType(Object.values(legData)));
      const assetPrice = document.getElementById('asset-price')?.value;
      const marginRequired = document.getElementById('margin-required')?.value;
      setMetrics(calculateStrategyMetrics(Object.values(legData), parseFloat(assetPrice), parseFloat(marginRequired)));
      if (chartInstanceRef.current) {
        updatePayoffChart(
          chartInstanceRef.current, 
          Object.values(legData), 
          document.getElementById('asset-price')?.value
        );
      }
    }
  }, [legData, metrics]);

  /**
   * Effect hook to detect the strategy type whenever leg data changes.
   */
  useEffect(() => {
    if (Object.keys(legData).length > 0) {
      setStrategyType(detectStrategyType(Object.values(legData)));
      const assetPrice = document.getElementById('asset-price')?.value;
      const marginRequired = document.getElementById('margin-required')?.value;
      setMetrics(calculateStrategyMetrics(Object.values(legData), parseFloat(assetPrice), parseFloat(marginRequired)));
      if (chartInstanceRef.current) {
        updatePayoffChart(
          chartInstanceRef.current, 
          Object.values(legData), 
          document.getElementById('asset-price')?.value
        );
      }
    }
  }, [legData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const tradeOutcome = e.target['trade-outcome'].value;
      const marginRequired = parseFloat(e.target['margin-required'].value);
      const pnl = tradeOutcome !== 'pending' ? parseFloat(e.target['pnl-amount'].value) : null;

      const formData = {
        asset: e.target.asset.value,
        openDate: e.target['open-date'].value,
        closeDate: e.target['close-date'].value,
        strategyType,
        legs: Object.values(legData),
        marginRequired: marginRequired,
        assetPrice: e.target['asset-price'].value,
        maxProfit: metrics.maxProfit,
        maxLoss: metrics.maxLoss,
        tradeOutcome: tradeOutcome,
        pnl: tradeOutcome === 'loss' ? -pnl : pnl,
        roi: pnl ? (pnl / marginRequired) * 100 : null,
        timestamp: Date.now()
      };

      // Save using storage service
      storageService.saveStrategy(formData);

      // Reset form
      e.target.reset();
      setLegs([{ id: 1 }]);
      setLegData({ 1: { action: 'Sell', type: 'Call', strike: '', premium: '', contracts: 1 } });
      setStrategyType('');
      setTradeOutcome('pending');
      setMetrics({
        netPremium: 0,
        maxProfit: 0,
        maxLoss: 0,
        breakevens: [],
        probProfit: 0,
        roi: 0
      });
    } catch (error) {
      console.error('Error saving strategy:', error);
      // TODO: Show error notification to user
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="card p-6">
          <h2 className="text-xl font-semibold mb-6 text-emerald-400 flex items-center">
            <span className="material-icons mr-2">analytics</span>
            Strategy Builder
          </h2>
          <div className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label htmlFor="asset" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Asset</label>
              <Select name="asset" id="asset">
                <option>Ethereum</option>
                <option>Bitcoin</option>
                <option>Solana</option>
              </Select>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="open-date" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Open Date</label>
                <DatePicker id="open-date" name="open-date" />
              </div>
              <div>
                <label htmlFor="close-date" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Close Date</label>
                <DatePicker id="close-date" name="close-date" />
              </div>
            </div>

            {/* Strategy Type */}
            <div>
              <label htmlFor="strategy-type" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Strategy Type</label>
              <Input
                type="text"
                id="strategy-type"
                name="strategy-type"
                value={strategyType}
                placeholder="e.g., Covered Call, Straddle"
                readOnly
                className="bg-[#21262D] cursor-not-allowed"
              />
            </div>

            {/* Legs Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium mb-2 text-[#C9D1D9]">Strategy Legs</label>
              <div className="space-y-4">
                {legs.map((leg, index) => (
                  <Leg
                    key={leg.id}
                    id={leg.id}
                    isFirst={index === 0}
                    onDelete={() => removeLeg(leg.id)}
                    onChange={handleLegChange}
                    values={legData[leg.id] || { action: index === 0 ? 'Sell' : 'Buy', type: 'Call', strike: '', premium: '', contracts: 1 }}
                  />
                ))}
              </div>

              {/* Add Leg Button */}
              {legs.length < 4 && (
                <button
                  type="button"
                  onClick={addLeg}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-[#21262D] text-[#C9D1D9] rounded-lg border border-[#30363D] hover:bg-[#30363D] transition-colors w-full justify-center"
                >
                  <span className="material-icons text-base">add_circle_outline</span>
                  <span>Add Another Leg</span>
                </button>
              )}
            </div>

            {/* Margin and Asset Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="margin-required" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Margin Required ($)</label>
                <Input
                  type="number"
                  id="margin-required"
                  name="margin-required"
                  placeholder="e.g., 1500"
                />
              </div>
              <div>
                <label htmlFor="asset-price" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Asset Price at Entry ($)</label>
                <Input
                  type="number"
                  id="asset-price"
                  name="asset-price"
                  placeholder="e.g., 3000"
                  onChange={handleAssetPriceChange}
                />
              </div>
            </div>

            {/* Trade Outcome */}
            <div className="space-y-4">
              <div>
                <label htmlFor="trade-outcome" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Trade Outcome</label>
                <Select 
                  name="trade-outcome" 
                  id="trade-outcome"
                  value={tradeOutcome}
                  onChange={(e) => setTradeOutcome(e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="profit">Profit</option>
                  <option value="loss">Loss</option>
                </Select>
              </div>
              {tradeOutcome !== 'pending' && (
                <div>
                  <label htmlFor="pnl-amount" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                    {tradeOutcome === 'profit' ? 'Profit Amount ($)' : 'Loss Amount ($)'}
                  </label>
                  <Input
                    type="number"
                    id="pnl-amount"
                    name="pnl-amount"
                    placeholder="Enter amount"
                    step="0.01"
                    required
                  />
                </div>
              )}
            </div>
          </div>          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary w-full px-4 py-3 mt-8"
          >
            Add Strategy
          </button>
        </form>
      </div>
      <div className="lg:col-span-3">
        <div className="card p-6 flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-6 text-emerald-400 flex items-center">
            <span className="material-icons mr-2">analytics</span>
            Strategy Analysis
          </h2>
          
          <div className="chart-container mb-6">
            <canvas ref={chartRef}></canvas>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card">
              <span className="text-xs font-medium text-[#8B949E] block mb-1">Net Premium</span>
              <span className="text-lg font-semibold">
                ${typeof metrics.netPremium === 'number' ? metrics.netPremium.toFixed(2) : metrics.netPremium}
              </span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-medium text-[#8B949E] block mb-1">Max Profit</span>
              <span className={`text-lg font-semibold ${metrics.maxProfit > 0 ? 'metric-value-positive' : ''}`}>
                {metrics.maxProfit === 'Unlimited' ? 'Unlimited' : `$${metrics.maxProfit.toFixed(2)}`}
              </span>
            </div>
            <div className="stat-card">
              <span className="text-xs font-medium text-[#8B949E] block mb-1">Max Loss</span>
              <span className={`text-lg font-semibold ${typeof metrics.maxLoss === 'number' ? 'metric-value-negative' : ''}`}>
                {metrics.maxLoss === 'Unlimited' ? 'Unlimited' : `-$${Math.abs(metrics.maxLoss).toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="metrics-panel">
            <div className="metric-item">
              <span className="metric-label">Breakeven Points</span>
              <span className="metric-value">
                ${metrics.breakevens.map(b => b.toFixed(2)).join(', $')}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Probability of Profit</span>
              <span className="metric-value">{metrics.probProfit}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">ROI on Max Loss</span>
              <span className={`metric-value ${metrics.roi > 0 ? 'metric-value-positive' : 'metric-value-negative'}`}>
                {metrics.roi}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyForm;
