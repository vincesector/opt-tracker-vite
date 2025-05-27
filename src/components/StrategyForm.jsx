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
  const [tradeOutcome, setTradeOutcome] = useState('pending');
  const [asset, setAsset] = useState(''); // Declare asset state
  const [assetPrice, setAssetPrice] = useState('');
  const [marginRequired, setMarginRequired] = useState('');
  const [metrics, setMetrics] = useState({
    netPremium: 0,
    maxProfit: 0,
    maxLoss: 0,
    breakevens: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const calculateMetrics = () => {
    if (Object.keys(legData).length > 0 && assetPrice && marginRequired) {
      const newMetrics = calculateStrategyMetrics(
        Object.values(legData),
        parseFloat(assetPrice),
        parseFloat(marginRequired)
      );
      setMetrics(newMetrics);
    }
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
      calculateMetrics();
    }
  }, [legData, assetPrice, marginRequired]);

  useEffect(() => {
    // Update chart when metrics change
    if (chartInstanceRef.current && assetPrice) {
      updatePayoffChart(
        chartInstanceRef.current,
        Object.values(legData),
        assetPrice
      );
    }
  }, [metrics, assetPrice]);

  /**
   * Handles changes to the asset price input.
   * Recalculates strategy metrics based on the new asset price.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event.
   */
  const handleAssetPriceChange = (e) => {
    setAssetPrice(e.target.value);
  };

  const handleMarginRequiredChange = (e) => {
    setMarginRequired(e.target.value);
  };

  /**
   * Handles changes to a specific leg's values.
   * Updates the leg data and recalculates strategy metrics.
   * @param {string | number} id - The ID of the leg that changed.
   * @param {import('./Leg').LegValues} values - The new values for the leg.
   */
  const handleLegChange = (id, values) => {
    setLegData(prev => ({
      ...prev,
      [id]: values
    }));
  };

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

  const resetForm = () => {
    setLegs([{ id: 1 }]);
    setLegData({ 1: { action: 'Sell', type: 'Call', strike: '', premium: '', contracts: 1 } });
    setStrategyType('');
    setTradeOutcome('pending');
    setAsset('');
    setAssetPrice('');
    setMarginRequired('');
    setMetrics({
      netPremium: 0,
      maxProfit: 0,
      maxLoss: 0,
      breakevens: []
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const pnl = tradeOutcome !== 'pending' ? parseFloat(e.target['pnl-amount']?.value) : null;

      // Validate required fields
      if (!assetPrice) {
        throw new Error('Asset price is required');
      }
      if (!marginRequired) {
        throw new Error('Margin required is required');
      }

      // Ensure all legs have required fields
      Object.values(legData).forEach((leg, index) => {
        if (!leg.strike || !leg.premium) {
          throw new Error(`Leg ${index + 1} is missing required fields`);
        }
      });

      const formData = {
        asset: e.target.asset.value,
        open_date: e.target['open-date'].value,
        close_date: e.target['close-date'].value || null,
        strategy_type: strategyType,
        legs: Object.values(legData),
        margin_required: parseFloat(marginRequired),
        asset_price: parseFloat(assetPrice),
        max_profit: metrics.maxProfit === 'Unlimited' ? null : metrics.maxProfit,
        max_loss: metrics.maxLoss === 'Unlimited' ? null : metrics.maxLoss,
        net_premium: metrics.netPremium,
        trade_outcome: tradeOutcome,
        pnl: tradeOutcome === 'loss' ? -pnl : pnl,
        roi: pnl ? (pnl / parseFloat(marginRequired)) * 100 : null,
        created_at: new Date().toISOString(),
        timestamp: Date.now()
      };

      console.log('Submitting form data:', JSON.stringify(formData, null, 2));

      const savedStrategy = await storageService.saveStrategy(formData);
      console.log('Strategy saved successfully:', savedStrategy);
      resetForm();
      
      // Optionally add a small delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Error saving strategy:', error);
      setError(error.message || 'Failed to save strategy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="card p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-400">
              {error}
            </div>
          )}
          <h2 className="text-xl font-semibold mb-6 text-emerald-400 flex items-center">
            <span className="material-icons mr-2">analytics</span>
            Strategy Builder
          </h2>
          <div className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label htmlFor="asset" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Asset</label>
              <Select
                id="asset"
                name="asset"
                value={asset}
                onChange={(e) => setAsset(e.target.value)} // Use the state setter
                required
              >
                <option value="">Select Asset</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </Select>
            </div>
            
            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="open-date" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Open Date</label>
                <DatePicker
                  id="open-date"
                  aria-label="Open Date"
                  required
                />
              </div>
              <div>
                <label htmlFor="close-date" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Close Date</label>
                <DatePicker
                  id="close-date"
                  aria-label="Close Date (Optional)"
                />
              </div>
            </div>

            {/* Strategy Type */}
            <div>
              <label htmlFor="strategy-type" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Strategy Type</label>
              <Input
                type="text"
                id="strategy-type"
                placeholder="e.g., Covered Call, Straddle"
                readOnly
                className="bg-[#21262D] cursor-not-allowed"
                value={strategyType} // Bind value to state
              />
            </div>

            {/* Legs */}
            <div className="space-y-4">
              {Object.entries(legData).map(([id, values], index) => (
                <Leg 
                  key={id}
                  id={id}
                  isFirst={index === 0}
                  onDelete={() => handleRemoveLeg(id)}
                  onChange={handleLegChange}
                  values={values}
                />
              ))}

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
                  placeholder="e.g., 1500"
                  value={marginRequired}
                  onChange={handleMarginRequiredChange}
                />
              </div>
              <div>
                <label htmlFor="asset-price" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Asset Price at Entry ($)</label>
                <Input
                  type="number"
                  id="asset-price"
                  placeholder="e.g., 3000"
                  value={assetPrice}
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
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className={`btn btn-primary px-6 py-2 flex items-center space-x-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <>
                  <span className="material-icons animate-spin">refresh</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-icons">save</span>
                  <span>Save Strategy</span>
                </>
              )}
            </button>
          </div>
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

          {/* Strategy Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Net Premium Card */}
            <div className="stat-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">Net Premium <span className="material-icons text-xs cursor-help" title="Total premium received minus total premium paid.">info</span></span>
                {/* Placeholder for sparkline - requires a charting library */}
                <span className="text-green-400">~</span>
              </div>
              <span className="text-lg font-semibold">
                ${typeof metrics.netPremium === 'number' ? metrics.netPremium.toFixed(2) : metrics.netPremium}
              </span>
            </div>

            {/* Max Profit Card */}
            <div className="stat-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">Max Profit <span className="material-icons text-xs cursor-help" title="The maximum potential gain from the strategy.">info</span></span>
                <span className="material-icons text-green-400">trending_up</span>
              </div>
              <span className={`text-lg font-semibold ${metrics.maxProfit > 0 ? 'metric-value-positive' : ''}`}>
                {metrics.maxProfit === 'Unlimited' ? 'Unlimited' : `$${metrics.maxProfit.toFixed(2)}`}
              </span>
            </div>

            {/* Max Loss Card */}
            <div className="stat-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">Max Loss <span className="material-icons text-xs cursor-help" title="The maximum potential loss from the strategy.">info</span></span>
                <span className="material-icons text-red-400">trending_down</span>
              </div>
              <span className={`text-lg font-semibold ${typeof metrics.maxLoss === 'number' ? 'metric-value-negative' : ''}`}>
                {metrics.maxLoss === 'Unlimited' ? 'Unlimited' : `-$${Math.abs(metrics.maxLoss).toFixed(2)}`}
              </span>
            </div>

            {/* Breakeven Range Card */}
            <div className="stat-card flex flex-col justify-between">
               <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">Breakeven Range <span className="material-icons text-xs cursor-help" title="The price(s) at which the strategy results in neither a profit nor a loss.">info</span></span>
                {/* Placeholder for mini bar/chart - requires a charting library */}
                 <span className="text-blue-400">--</span>
              </div>
              <span className="text-lg font-semibold">
                {metrics.breakevens.length > 0 ? 
                  `$${metrics.breakevens.map(b => b.toFixed(2)).join(' - $')}` 
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Simplified Explanation Callout */}
          {(metrics.maxProfit !== 0 || metrics.maxLoss !== 0 || metrics.maxProfit === 'Unlimited' || metrics.maxLoss === 'Unlimited') && strategyType !== 'Custom' && (
            <div className="p-4 bg-[#1f242c] border-l-4 border-emerald-400 rounded-r-md mb-6">
              <p className="text-sm text-[#C9D1D9] mb-2">Simplified Explanation:</p>
              
              {/* Max Profit Explanation */}
              {metrics.maxProfit !== 0 && metrics.maxProfit !== 'Unlimited' && (
                <p className="text-sm text-green-400 flex items-center mb-1">
                  <span className="material-icons text-sm mr-2">check_circle</span>
                  {strategyType === 'Long Call' && metrics.breakevens.length > 0 &&
                    `If ${asset || 'the asset'} closes above $${metrics.breakevens[0].toFixed(2)}, you get max profit.`}
                  {strategyType === 'Long Put' && metrics.breakevens.length > 0 &&
                    `If ${asset || 'the asset'} closes below $${metrics.breakevens[0].toFixed(2)}, you get max profit.`}
                  {strategyType === 'Covered Call' && legData[1]?.strike &&
                     `If ${asset || 'the asset'} closes below $${parseFloat(legData[1].strike).toFixed(2)}, you get max profit.`}
                  {strategyType === 'Cash Secured Put' && legData[1]?.strike &&
                     `If ${asset || 'the asset'} closes above $${parseFloat(legData[1].strike).toFixed(2)}, you get max profit.`}
                  {(strategyType === 'Call Debit Spread' || strategyType === 'Put Credit Spread') && legData[Object.keys(legData).find(key => legData[key].action === 'Sell')]?.strike &&
                     `If ${asset || 'the asset'} closes above $${parseFloat(legData[Object.keys(legData).find(key => legData[key].action === 'Sell')].strike).toFixed(2)}, you get max profit.`}
                  {(strategyType === 'Call Credit Spread' || strategyType === 'Put Debit Spread') && legData[Object.keys(legData).find(key => legData[key].action === 'Sell')]?.strike &&
                     `If ${asset || 'the asset'} closes below $${parseFloat(legData[Object.keys(legData).find(key => legData[key].action === 'Sell')].strike).toFixed(2)}, you get max profit.`}
                   {(strategyType === 'Straddle' || strategyType === 'Strangle') && metrics.breakevens.length > 1 &&
                     `If ${asset || 'the asset'} closes outside the range $${Math.min(...metrics.breakevens).toFixed(2)} - $${Math.max(...metrics.breakevens).toFixed(2)}, your profit is unlimited.`}
                   {strategyType === 'Iron Condor' && metrics.breakevens.length > 1 &&
                     `If ${asset || 'the asset'} closes between $${Math.min(...metrics.breakevens).toFixed(2)} and $${Math.max(...metrics.breakevens).toFixed(2)}, you get max profit.`}
                </p>
              )}
              {metrics.maxProfit === 'Unlimited' && (
                 <p className="text-sm text-green-400 flex items-center mb-1">
                   <span className="material-icons text-sm mr-2">check_circle</span>
                   {`Your potential profit is unlimited.`}
                 </p>
               )}

              {/* Max Loss Explanation */}
               {metrics.maxLoss !== 0 && metrics.maxLoss !== 'Unlimited' && (
                <p className="text-sm text-red-400 flex items-center">
                   <span className="material-icons text-sm mr-2">cancel</span>
                   {strategyType === 'Long Call' && metrics.breakevens.length > 0 &&
                     `If ${asset || 'the asset'} closes below $${metrics.breakevens[0].toFixed(2)}, you get max loss.`}
                   {strategyType === 'Long Put' && metrics.breakevens.length > 0 &&
                     `If ${asset || 'the asset'} closes above $${metrics.breakevens[0].toFixed(2)}, you get max loss.`}
                   {strategyType === 'Covered Call' && legData[1]?.strike &&
                     `If ${asset || 'the asset'} closes above $${parseFloat(legData[1].strike).toFixed(2)}, you get max loss.`}
                   {strategyType === 'Cash Secured Put' && legData[1]?.strike &&
                     `If ${asset || 'the asset'} closes below $${parseFloat(legData[1].strike).toFixed(2)}, you get max loss.`}
                   {(strategyType === 'Call Debit Spread' || strategyType === 'Put Credit Spread') && legData[Object.keys(legData).find(key => legData[key].action === 'Buy')]?.strike &&
                     `If ${asset || 'the asset'} closes below $${parseFloat(legData[Object.keys(legData).find(key => legData[key].action === 'Buy')].strike).toFixed(2)}, you get max loss.`}
                   {(strategyType === 'Call Credit Spread' || strategyType === 'Put Debit Spread') && legData[Object.keys(legData).find(key => legData[key].action === 'Buy')]?.strike &&
                     `If ${asset || 'the asset'} closes above $${parseFloat(legData[Object.keys(legData).find(key => legData[key].action === 'Buy')].strike).toFixed(2)}, you get max loss.`}
                   {(strategyType === 'Straddle' || strategyType === 'Strangle') && metrics.breakevens.length > 1 &&
                     `If ${asset || 'the asset'} closes between $${Math.min(...metrics.breakevens).toFixed(2)} and $${Math.max(...metrics.breakevens).toFixed(2)}, you get max loss.`}
                   {strategyType === 'Iron Condor' && metrics.breakevens.length > 1 &&
                     `If ${asset || 'the asset'} closes outside the range $${Math.min(...metrics.breakevens).toFixed(2)} - $${Math.max(...metrics.breakevens).toFixed(2)}, you get max loss.`}
                </p>
              )}
               {metrics.maxLoss === 'Unlimited' && (
                 <p className="text-sm text-red-400 flex items-center">
                   <span className="material-icons text-sm mr-2">cancel</span>
                   {`Your potential loss is unlimited.`}
                 </p>
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StrategyForm;
