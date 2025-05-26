// Calculate strategy metrics based on leg data and strategy type
/**
 * Calculates the profit/loss for a single option leg at a given asset price.
 * @param {import('../components/Leg').LegValues} leg - The option leg data.
 * @param {number} assetPrice - The current asset price.
 * @returns {number} The profit or loss for the leg.
 */
const calculateLegPayoff = (leg, assetPrice) => {
  const strike = parseFloat(leg.strike) || 0;
  const premium = parseFloat(leg.premium) || 0;
  const contracts = parseInt(leg.contracts) || 1;
  let payoff = 0;

  if (leg.type === 'Call') {
    payoff = Math.max(0, assetPrice - strike) - premium;
  } else if (leg.type === 'Put') {
    payoff = Math.max(0, strike - assetPrice) - premium;
  }

  if (leg.action === 'Sell') {
    payoff = -payoff;
  }

  return payoff * contracts;
};

/**
 * Calculates the total profit/loss for a strategy at a given asset price.
 * @param {Array<import('../components/Leg').LegValues>} legs - An array of leg objects.
 * @param {number} assetPrice - The current asset price.
 * @returns {number} The total profit or loss for the strategy.
 */
const calculateStrategyPayoff = (legs, assetPrice) => {
  let totalPayoff = 0;
  legs.forEach(leg => {
    totalPayoff += calculateLegPayoff(leg, assetPrice);
  });
  return totalPayoff;
};

/**
 * Calculates various metrics for an option strategy.
 * @param {Array<import('../components/Leg').LegValues>} legs - An array of leg objects.
 * @param {number} [assetPrice] - The current asset price (optional, used for some calculations).
 * @param {number} [marginRequired] - The margin required for the strategy (optional, used for ROI calculation).
 * @returns {import('../components/StrategyForm').StrategyMetrics} The calculated strategy metrics.
 */
export const calculateStrategyMetrics = (legs, assetPrice, marginRequired) => {
  if (!legs || legs.length === 0) {
    return {
      netPremium: 0,
      maxProfit: 0,
      maxLoss: 0,
      breakevens: [],
      probProfit: 0,
      roi: 0
    };
  }

  let netPremium = 0;
  let maxProfit = 0;
  let maxLoss = 0;
  let breakevens = [];

  // Calculate net premium
  legs.forEach(leg => {
    const premium = parseFloat(leg.premium) || 0;
    const contracts = parseInt(leg.contracts) || 1;
    if (leg.action === 'Sell') {
      netPremium += premium * contracts;
    } else {
      netPremium -= premium * contracts;
    }
  });

  // Strategy-specific calculations
  if (legs.length === 1) {
    const leg = legs[0];
    const strike = parseFloat(leg.strike) || 0;
    const premium = parseFloat(leg.premium) || 0;
    const contracts = parseInt(leg.contracts) || 1;

    if (leg.action === 'Buy' && leg.type === 'Call') {
      // Long Call
      maxLoss = premium * contracts;
      maxProfit = 'Unlimited';
      breakevens = [strike + premium];
    } else if (leg.action === 'Buy' && leg.type === 'Put') {
      // Long Put
      maxLoss = premium * contracts;
      maxProfit = strike > premium ? (strike - premium) * contracts : 0;
      breakevens = [strike - premium];
    } else if (leg.action === 'Sell' && leg.type === 'Call') {
      // Covered Call
      maxProfit = premium * contracts;
      maxLoss = 'Unlimited';
      breakevens = [strike + premium];
    } else if (leg.action === 'Sell' && leg.type === 'Put') {
      // Cash Secured Put
      maxProfit = premium * contracts;
      maxLoss = strike > premium ? (strike - premium) * contracts : 0;
      breakevens = [strike - premium];
    }
  } else if (legs.length === 2) {
    const [leg1, leg2] = legs;
    const strike1 = parseFloat(leg1.strike) || 0;
    const strike2 = parseFloat(leg2.strike) || 0;
    const premium1 = parseFloat(leg1.premium) || 0;
    const premium2 = parseFloat(leg2.premium) || 0;
    const contracts = Math.min(parseInt(leg1.contracts) || 1, parseInt(leg2.contracts) || 1);

    if (leg1.type === leg2.type) {
      // Credit or Debit Spread
      const width = Math.abs(strike1 - strike2);
      if (netPremium > 0) {
        // Credit Spread
        maxProfit = netPremium;
        maxLoss = (width * contracts) - netPremium;
      } else {
        // Debit Spread
        maxProfit = (width * contracts) + netPremium;
        maxLoss = Math.abs(netPremium);
      }
      breakevens = [
        leg1.type === 'Call' 
          ? Math.min(strike1, strike2) + Math.abs(netPremium)
          : Math.max(strike1, strike2) - Math.abs(netPremium)
      ];
    } else if (strike1 === strike2) {
      // Straddle
      maxLoss = Math.abs(netPremium) * contracts;
      maxProfit = 'Unlimited';
      breakevens = [strike1 - Math.abs(netPremium), strike1 + Math.abs(netPremium)];
    } else {
      // Strangle
      maxLoss = Math.abs(netPremium) * contracts;
      maxProfit = 'Unlimited';
      const [lowerStrike, upperStrike] = [Math.min(strike1, strike2), Math.max(strike1, strike2)];
      breakevens = [lowerStrike - Math.abs(netPremium), upperStrike + Math.abs(netPremium)];
    }
  } else if (legs.length === 4) {
    // Iron Condor
    const sortedLegs = [...legs].sort((a, b) => parseFloat(a.strike) - parseFloat(b.strike));
    const width = Math.min(
      Math.abs(parseFloat(sortedLegs[1].strike) - parseFloat(sortedLegs[0].strike)),
      Math.abs(parseFloat(sortedLegs[3].strike) - parseFloat(sortedLegs[2].strike))
    );
    
    maxProfit = netPremium;
    maxLoss = width - netPremium;
    
    // Breakevens are at the short strikes +/- net premium
    const shortStrikes = legs
      .filter(leg => leg.action === 'Sell')
      .map(leg => parseFloat(leg.strike))
      .sort((a, b) => a - b);
    
    breakevens = [
      shortStrikes[0] - netPremium,
      shortStrikes[1] + netPremium
    ];
  }

  // Calculate probability of profit (simplified)
  let probProfit = 0;
  if (breakevens.length > 0) {
    // For spreads, a simplified PoP is based on the breakeven relative to the current price
    // This is a very basic estimation and doesn't use implied volatility
    if (legs.length === 2 && legs[0].type === legs[1].type) { // It's a spread
      const breakeven = breakevens[0];
      // This is a placeholder. A real calculation needs more data.
      // For a put spread, profit if price > breakeven
      // For a call spread, profit if price > breakeven
      // We'll just return a placeholder for now.
      probProfit = 'N/A'; // Needs more sophisticated calculation
    } else if (assetPrice && breakevens.length > 0) {
      const avgBreakeven = breakevens.reduce((a, b) => a + b, 0) / breakevens.length;
      // This is a very simple estimation. In reality, you'd want to use
      // implied volatility and other factors for a more accurate calculation
      probProfit = assetPrice > avgBreakeven ? 65 : 35;
    }
  }

  // Calculate ROI
  let roi = 0;
  if (marginRequired && marginRequired !== 0) {
    roi = (netPremium / marginRequired) * 100;
  }

  return {
    netPremium: parseFloat(netPremium.toFixed(2)),
    maxProfit: maxProfit === 'Unlimited' ? maxProfit : parseFloat(maxProfit.toFixed(2)),
    maxLoss: maxLoss === 'Unlimited' ? maxLoss : parseFloat(maxLoss.toFixed(2)),
    breakevens: breakevens.map(b => parseFloat(b.toFixed(2))),
    probProfit,
    roi: parseFloat(roi.toFixed(2))
  };
};

/**
 * Generates data points for the payoff chart.
 * @param {Array<import('../components/Leg').LegValues>} legs - An array of leg objects.
 * @returns {{assetPrices: number[], payoffs: number[]}} An object containing arrays of asset prices and corresponding payoffs.
 */
export const generatePayoffData = (legs) => {
  if (!legs || legs.length === 0) {
    return { assetPrices: [], payoffs: [] };
  }

  // Determine a reasonable range for asset prices based on strikes
  const strikes = legs.map(leg => parseFloat(leg.strike) || 0).filter(strike => strike > 0);
  const minStrike = strikes.length > 0 ? Math.min(...strikes) : 10;
  const maxStrike = strikes.length > 0 ? Math.max(...strikes) : 100;

  const minPrice = Math.max(0, minStrike * 0.5);
  const maxPrice = maxStrike * 1.5;
  const step = (maxPrice - minPrice) / 100;

  const assetPrices = [];
  const payoffs = [];

  for (let price = minPrice; price <= maxPrice; price += step) {
    assetPrices.push(price);
    payoffs.push(calculateStrategyPayoff(legs, price));
  }

  return { assetPrices, payoffs };
};
