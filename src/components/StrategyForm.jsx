import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import Select from './Select';
import Input from './Input';
import DatePicker from './DatePicker';
import Leg from './Leg';
import { calculateStrategyMetrics } from '../utils/strategyCalculations';
import { initChart, updatePayoffChart } from '../utils/chartUtils';
import { storageService } from '../services/storageService';

/**
 * @typedef {object} StrategyMetrics
 * @property {number} netPremium - The net premium received or paid.
 * @property {number | 'Unlimited'} maxProfit - The maximum potential profit.
 * @property {number | 'Unlimited'} maxLoss - The maximum potential loss.
 * @property {number[]} breakevens - An array of breakeven points.
 * @property {string} probProfit - The probability of profit (as a percentage, or 'N/A').
 * @property {number} roi - The Return on Investment (as a percentage).
 * @property {string} strategyName - The detected name of the strategy.
 * @property {string} strategyType - The detected type of the strategy (e.g., 'Vertical Spread', 'Condor').
 * @property {string} direction - The direction of the strategy ('Long' or 'Short').
 * @property {boolean} isCredit - True if the strategy is a credit strategy.
 * @property {boolean} isReverse - True if the strategy is a reverse version.
 * @property {string} optionType - The type of options used ('Calls', 'Puts', or 'Mixed').
 */

/**
 * The main component for the Option Strategy Tracker form.
 * Manages the state of the option legs, calculates strategy metrics, and updates the payoff chart.
 * @returns {JSX.Element}
 */
const StrategyForm = ({ capital, onStrategySaved }) => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [legs, setLegs] = useState([{ id: 1 }]);
  const [legData, setLegData] = useState({ 1: { action: 'Sell', type: 'Call', strike: '', premium: '', contracts: 1 } });
  const [strategyName, setStrategyName] = useState(''); // Changed from strategyType
  const [tradeOutcome, setTradeOutcome] = useState('pending');
  const [underlyingAsset, setUnderlyingAsset] = useState('');
  const [settlementAsset, setSettlementAsset] = useState('');
  const [assetPrice, setAssetPrice] = useState('');
  const [marginRequired, setMarginRequired] = useState('');
  const [metrics, setMetrics] = useState({
    netPremium: 0,
    maxProfit: 0,
    maxLoss: 0,
    breakevens: [],
    probProfit: 'N/A',
    roi: 0,
    strategyName: 'N/A',
    strategyType: 'N/A',
    direction: 'N/A',
    isCredit: false,
    isReverse: false,
    optionType: 'N/A',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const initialCapitalValue = parseFloat(localStorage.getItem('initialCapital') || 0);

  const calculateMetrics = () => {
    // Ensure there's at least one leg to calculate metrics for
    if (Object.keys(legData).length === 0) {
      setMetrics({
        netPremium: 0, maxProfit: 0, maxLoss: 0, breakevens: [], probProfit: 'N/A', roi: 0,
        strategyName: 'N/A', strategyType: 'N/A', direction: 'N/A', isCredit: false, isReverse: false, optionType: 'N/A',
      });
      setStrategyName('N/A');
      return;
    }

    const currentAssetPrice = parseFloat(assetPrice);
    const currentMarginRequired = parseFloat(marginRequired);

    const newMetrics = calculateStrategyMetrics(
      Object.values(legData),
      isNaN(currentAssetPrice) ? undefined : currentAssetPrice,
      isNaN(currentMarginRequired) ? undefined : currentMarginRequired,
    );
    setMetrics(newMetrics);
    setStrategyName(newMetrics.strategyName);
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
      const newId = legs.length + 1; // Use the current length for leg numbering
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
    const updatedLegs = legs.filter(leg => leg.id !== legId);
    const updatedLegData = { ...legData };
    delete updatedLegData[legId];

      if (updatedLegs.length === 0) {
        // If all legs are removed, keep the button visible
        setLegs([{ id: 1 }]);
        setLegData({ 1: { action: 'Sell', type: 'Call', strike: '', premium: '', contracts: 1 } });
    } else {
      setLegs(updatedLegs);
      setLegData(updatedLegData);
    }
  };

  const resetForm = () => {
    setLegs([{ id: 1 }]);
    setLegData({ 1: { action: 'Sell', type: 'Call', strike: '', premium: '', contracts: 1 } });
    setStrategyName(''); // Reset strategyName
    setTradeOutcome('pending');
    setUnderlyingAsset('');
    setSettlementAsset('');
    setAssetPrice('');
    setMarginRequired('');
    setMetrics({
      netPremium: 0,
      maxProfit: 0,
      maxLoss: 0,
      breakevens: [],
      probProfit: 'N/A',
      roi: 0,
      strategyName: 'N/A',
      strategyType: 'N/A',
      direction: 'N/A',
      isCredit: false,
      isReverse: false,
      optionType: 'N/A',
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to add a strategy. Please log in or sign up.');
      return;
    }
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
        underlying_asset: underlyingAsset,
        settlement_asset: settlementAsset,
        open_date: e.target['open-date'].value,
        close_date: e.target['close-date'].value || null,
        strategy_type: metrics.strategyName,
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
      if (onStrategySaved) onStrategySaved(formData);
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
        <form
          onSubmit={handleSubmit}
          className="card p-6 bg-[#161B22] shadow-xl rounded-xl"
        >
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
            {/* Underlying Asset Selection */}
            <div className="border-b border-gray-700 pb-4">
              <label htmlFor="underlying-asset" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Underlying Asset</label>
              <Select
                id="underlying-asset"
                name="underlying-asset"
                value={underlyingAsset}
                onChange={e => setUnderlyingAsset(e.target.value)}
                required
              >
                <option value="">Select Asset</option>
                {["BTC","ETH","SOL"].map((a, idx) => (
                  <option key={idx} value={a}>{a}</option>
                ))}
              </Select>
            </div>
            {/* Settlement Asset Selection */}
            <div className="border-b border-gray-700 pb-4">
              <label htmlFor="settlement-asset" className="block text-sm font-medium mb-2 text-[#C9D1D9]">Settlement Asset</label>
              <Select
                id="settlement-asset"
                name="settlement-asset"
                value={settlementAsset}
                onChange={e => setSettlementAsset(e.target.value)}
                required
              >
                <option value="">Select Asset</option>
                {["USD","BTC","ETH","SOL"].map((a, idx) => (
                  <option key={idx} value={a}>{a}</option>
                ))}
              </Select>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-700 pb-4">
              <div>
                <label
                  htmlFor="open-date"
                  className="block text-sm font-medium mb-2 text-[#C9D1D9]"
                >
                  Open Date
                </label>
                <DatePicker id="open-date" aria-label="Open Date" required />
              </div>
              <div>
                <label
                  htmlFor="close-date"
                  className="block text-sm font-medium mb-2 text-[#C9D1D9]"
                >
                  Close Date
                </label>
                <DatePicker id="close-date" aria-label="Close Date (Optional)" />
              </div>
            </div>

            {/* Strategy Type */}
            <div className="border-b border-gray-700 pb-4">
              <label
                htmlFor="strategy-type"
                className="block text-sm font-medium mb-2 text-[#C9D1D9]"
              >
                Strategy Type
              </label>
              <Input
                type="text"
                id="strategy-type"
                placeholder="e.g., Covered Call, Straddle"
                readOnly
                className="bg-[#21262D] cursor-not-allowed"
                value={metrics.strategyName} // Bind value to metrics.strategyName
              />
            </div>

            {/* Legs */}
            <div className="space-y-4 border-b border-gray-700 pb-4">
              {Object.entries(legData).map(([id, values], index) => (
                <Leg
                  key={id}
                  id={id}
                  isFirst={index === 0}
                  onDelete={() => removeLeg(id)}
                  onChange={handleLegChange}
                  values={values}
                />
              ))}

              {/* Add Leg Button */}
              <button
                type="button"
                onClick={addLeg}
                disabled={legs.length >= 4} // Disable if 4 or more legs
                className={`inline-flex items-center space-x-2 px-4 py-2 bg-[#21262D] text-[#C9D1D9] rounded-lg border border-[#30363D] transition-colors w-full justify-center ${
                  legs.length >= 4
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-[#30363D]"
                }`}
              >
                <span className="material-icons text-base">add_circle_outline</span>
                <span>Add Another Leg</span>
              </button>
            </div>

            {/* Margin and Asset Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-700 pb-4">
              <div>
                <label htmlFor="margin-required" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                  Margin Required ({settlementAsset || 'Asset'})
                </label>
                <Input
                  type="number"
                  id="margin-required"
                  placeholder="e.g., 1500"
                  value={marginRequired}
                  onChange={handleMarginRequiredChange}
                />
              </div>
              <div>
                <label htmlFor="asset-price" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                  Asset Price at Entry ({underlyingAsset || 'Asset'})
                </label>
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
            <div className="space-y-4 border-b border-gray-700 pb-4">
              <div>
                <label
                  htmlFor="trade-outcome"
                  className="block text-sm font-medium mb-2 text-[#C9D1D9]"
                >
                  Trade Outcome
                </label>
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
              {tradeOutcome !== "pending" && (
                <div>
                  <label htmlFor="pnl-amount" className="block text-sm font-medium mb-2 text-[#C9D1D9]">
                    {tradeOutcome === "profit"
                      ? `Profit Amount (${settlementAsset || 'Asset'})`
                      : `Loss Amount (${settlementAsset || 'Asset'})`}
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
          </div>{" "}
          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className={`btn btn-primary px-6 py-2 flex items-center space-x-2 bg-gradient-to-r from-green-400 to-emerald-400 hover:opacity-90 transition-opacity ${
                saving ? "opacity-50 cursor-not-allowed" : ""
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
        <div className="card p-6 flex flex-col h-full bg-[#161B22] shadow-xl rounded-xl">
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
                <span className="text-xs font-medium text-[#8B949E]">
                  Net Premium{" "}
                  <span
                    className="material-icons text-xs cursor-help"
                    title="Total premium received minus total premium paid."
                  >
                    info
                  </span>
                </span>
                {/* Placeholder for sparkline - requires a charting library */}
                <span className="text-green-400">~</span>
              </div>
              <span className="text-lg font-semibold">
                $
                {typeof metrics.netPremium === "number"
                  ? metrics.netPremium.toFixed(2)
                  : metrics.netPremium}
              </span>
            </div>

            {/* Max Profit Card */}
            <div className="stat-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">
                  Max Profit{" "}
                  <span
                    className="material-icons text-xs cursor-help"
                    title="The maximum potential gain from the strategy."
                  >
                    info
                  </span>
                </span>
                <span className="material-icons text-green-400">trending_up</span>
              </div>
              <span
                className={`text-lg font-semibold ${
                  metrics.maxProfit > 0 ? "metric-value-positive" : ""
                }`}
              >
                {metrics.maxProfit === "Unlimited"
                  ? "Unlimited"
                  : `$${metrics.maxProfit.toFixed(2)}`}
              </span>
            </div>

            {/* Max Loss Card */}
            <div className="stat-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">
                  Max Loss{" "}
                  <span
                    className="material-icons text-xs cursor-help"
                    title="The maximum potential loss from the strategy."
                  >
                    info
                  </span>
                </span>
                <span className="material-icons text-red-400">trending_down</span>
              </div>
              <span
                className={`text-lg font-semibold ${
                  typeof metrics.maxLoss === "number" ? "metric-value-negative" : ""
                }`}
              >
                {metrics.maxLoss === "Unlimited"
                  ? "Unlimited"
                  : `-$${Math.abs(metrics.maxLoss).toFixed(2)}`}
              </span>
            </div>

            {/* Breakeven Range Card */}
            <div className="stat-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#8B949E]">
                  Breakeven Range{" "}
                  <span
                    className="material-icons text-xs cursor-help"
                    title="The price(s) at which the strategy results in neither a profit nor a loss."
                  >
                    info
                  </span>
                </span>
                {/* Placeholder for mini bar/chart - requires a charting library */}
                <span className="text-blue-400">--</span>
              </div>
              <span className="text-lg font-semibold">
                {metrics.breakevens.length > 0
                  ? `$${metrics.breakevens
                      .map((b) => b.toFixed(2))
                      .join(" - $")}`
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Simplified Explanation Callout */}
          {(metrics.maxProfitExplanation || metrics.maxLossExplanation) &&
            metrics.strategyType !== "Custom" && (
              <div className="p-4 bg-[#1f242c] border-l-4 border-emerald-400 rounded-r-md mb-6">
                <p className="text-sm text-[#C9D1D9] mb-2">
                  Simplified Explanation:
                </p>

                {/* Max Profit Explanation */}
                {metrics.maxProfitExplanation && (
                  <p className="text-sm text-green-400 flex items-center mb-1">
                    <span className="material-icons text-sm mr-2">
                      check_circle
                    </span>
                    {metrics.maxProfitExplanation}
                  </p>
                )}

                {/* Max Loss Explanation */}
                {metrics.maxLossExplanation && (
                  <p className="text-sm text-red-400 flex items-center">
                    <span className="material-icons text-sm mr-2">cancel</span>
                    {metrics.maxLossExplanation}
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
