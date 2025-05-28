import { storageService } from '../src/services/storageService.js';
import { calculateStrategyMetrics } from '../src/utils/strategyCalculations.js';

const testStrategiesData = [
  // Long Call (Profit)
  {
    asset: 'BTC',
    open_date: '2023-10-01',
    close_date: '2023-10-20',
    legs: [{ id: 1, action: 'Buy', type: 'Call', strike: '28000', premium: '500', contracts: 1 }],
    margin_required: 500,
    asset_price: 29000, // Asset price at entry
    trade_outcome: 'profit',
    // pnl and roi will be calculated
  },
  // Long Put (Loss)
  {
    asset: 'ETH',
    open_date: '2023-10-05',
    close_date: '2023-10-25',
    legs: [{ id: 1, action: 'Buy', type: 'Put', strike: '1800', premium: '100', contracts: 1 }],
    margin_required: 100,
    asset_price: 1900, // Asset price at entry
    trade_outcome: 'loss',
    // pnl and roi will be calculated
  },
  // Call Credit Spread (Profit)
  {
    asset: 'SOL',
    open_date: '2023-10-10',
    close_date: '2023-11-01',
    legs: [
      { id: 1, action: 'Sell', type: 'Call', strike: '25', premium: '2', contracts: 1 },
      { id: 2, action: 'Buy', type: 'Call', strike: '30', premium: '0.5', contracts: 1 }
    ],
    margin_required: 300, // (Strike difference - Net Premium) * contracts = (30-25 - 1.5) * 1 = 3.5 * 100 = 350? (simplified)
    asset_price: 26, // Asset price at entry
    trade_outcome: 'profit',
    // pnl and roi will be calculated
  },
   // Put Debit Spread (Loss)
  {
    asset: 'BTC',
    open_date: '2023-10-15',
    close_date: '2023-11-05',
    legs: [
      { id: 1, action: 'Buy', type: 'Put', strike: '30000', premium: '800', contracts: 1 },
      { id: 2, action: 'Sell', type: 'Put', strike: '29000', premium: '400', contracts: 1 }
    ],
    margin_required: 400, // Net Premium * contracts = 400 * 1 = 400
    asset_price: 29500, // Asset price at entry
    trade_outcome: 'loss',
    // pnl and roi will be calculated
  },
  // Straddle (Profit)
  {
    asset: 'ETH',
    open_date: '2023-10-20',
    close_date: '2023-11-10',
    legs: [
      { id: 1, action: 'Buy', type: 'Call', strike: '1900', premium: '150', contracts: 1 },
      { id: 2, action: 'Buy', type: 'Put', strike: '1900', premium: '150', contracts: 1 }
    ],
    margin_required: 300, // Net Premium * contracts = 300 * 1 = 300
    asset_price: 2000, // Asset price at entry
    trade_outcome: 'profit',
    // pnl and roi will be calculated
  },
  // Iron Condor (Loss)
   {
    asset: 'SOL',
    open_date: '2023-10-25',
    close_date: '2023-11-15',
    legs: [
      { id: 1, action: 'Sell', type: 'Put', strike: '20', premium: '0.5', contracts: 1 },
      { id: 2, action: 'Buy', type: 'Put', strike: '15', premium: '0.2', contracts: 1 },
      { id: 3, action: 'Buy', type: 'Call', strike: '35', premium: '0.3', contracts: 1 },
      { id: 4, action: 'Sell', type: 'Call', strike: '40', premium: '0.8', contracts: 1 }
    ],
    margin_required: 500, // Wider spread * contracts = (20-15) * 100 = 500 (simplified)
    asset_price: 28, // Asset price at entry
    trade_outcome: 'loss',
    // pnl and roi will be calculated
  },
];

async function addTestStrategies() {
  console.log('Adding test strategies...');
  for (const strategyData of testStrategiesData) {
    try {
      // Calculate metrics based on the legs and entry asset price
      const metrics = calculateStrategyMetrics(
        strategyData.legs,
        strategyData.asset_price,
        strategyData.margin_required
      );

      // Determine P&L and ROI based on the trade outcome for the test case
      let pnl = null;
      let roi = null;
      if (strategyData.trade_outcome === 'profit') {
         // For simplicity in testing, assume a profit value if outcome is profit
         // In a real scenario, this would be the actual profit at close
         pnl = metrics.maxProfit !== 'Unlimited' && metrics.maxProfit > 0 ? metrics.maxProfit * 0.8 : 100; // Example profit
         roi = (pnl / strategyData.margin_required) * 100;
      } else if (strategyData.trade_outcome === 'loss') {
         // For simplicity in testing, assume a loss value if outcome is loss
         // In a real scenario, this would be the actual loss at close
         pnl = metrics.maxLoss !== 'Unlimited' && metrics.maxLoss < 0 ? metrics.maxLoss * 0.8 : -50; // Example loss
         roi = (pnl / strategyData.margin_required) * 100;
      }

      const strategyToSave = {
        ...strategyData,
        max_profit: metrics.maxProfit === 'Unlimited' ? null : metrics.maxProfit,
        max_loss: metrics.maxLoss === 'Unlimited' ? null : metrics.maxLoss,
        net_premium: metrics.netPremium,
        pnl: pnl,
        roi: roi,
        created_at: new Date().toISOString(),
        timestamp: Date.now(),
      };

      console.log(`Saving ${strategyData.strategy_type} for ${strategyData.asset}...`);
      await storageService.saveStrategy(strategyToSave);
      console.log('Saved successfully.');

    } catch (error) {
      console.error(`Error adding test strategy for ${strategyData.strategy_type}:`, error);
    }
  }
  console.log('Finished adding test strategies.');
}

addTestStrategies();
