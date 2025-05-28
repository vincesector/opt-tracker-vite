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
 * Detects the type of option strategy based on the provided legs.
 * @param {Array<import('../components/Leg').LegValues>} legs - An array of leg objects.
 * @returns {{name: string, type: string, direction: string, isCredit: boolean, isReverse: boolean, optionType: string}} Detected strategy details.
 */
const detectStrategy = (legs) => {
  const numLegs = legs.length;
  const callLegs = legs.filter(leg => leg.type === 'Call');
  const putLegs = legs.filter(leg => leg.type === 'Put');
  const strikes = legs.map(leg => parseFloat(leg.strike)).sort((a, b) => a - b);
  const uniqueStrikes = [...new Set(strikes)];

  let name = 'Custom Strategy';
  let type = 'Custom';
  let direction = ''; // Long or Short
  let isCredit = false;
  let isReverse = false;
  let optionType = ''; // Calls, Puts, or Mixed

  // Determine option type
  if (callLegs.length === numLegs) {
    optionType = 'Calls';
  } else if (putLegs.length === numLegs) {
    optionType = 'Puts';
  } else {
    optionType = 'Mixed';
  }

  // Calculate net premium to determine credit/debit
  let netPremium = 0;
  legs.forEach(leg => {
    const premium = parseFloat(leg.premium) || 0;
    const contracts = parseInt(leg.contracts) || 1;
    if (leg.action === 'Sell') {
      netPremium += premium * contracts;
    } else {
      netPremium -= premium * contracts;
    }
  });
  isCredit = netPremium > 0;
  direction = isCredit ? 'Short' : 'Long';

  if (numLegs === 1) {
    const leg = legs[0];
    if (leg.action === 'Buy') {
      name = `Long ${leg.type}`;
      type = 'Single Leg';
    } else {
      name = `Naked ${leg.type}`;
      type = 'Single Leg';
    }
  } else if (numLegs === 2) {
    if (optionType !== 'Mixed') { // All Calls or All Puts
      type = 'Vertical Spread';
      name = `${optionType} Vertical Spread`; // Default to generic Vertical Spread

      // Filter out invalid strikes for sorting and unique check
      const validStrikes = legs.map(leg => parseFloat(leg.strike)).filter(s => !isNaN(s) && s > 0);
      const uniqueValidStrikes = [...new Set(validStrikes)];

      if (uniqueValidStrikes.length === 2) {
        const [leg1, leg2] = legs.sort((a, b) => parseFloat(a.strike) - parseFloat(b.strike));
        
        if (optionType === 'Calls') {
          if (leg1.action === 'Buy' && leg2.action === 'Sell') {
            name = 'Bull Call Spread';
          } else if (leg1.action === 'Sell' && leg2.action === 'Buy') {
            name = 'Bear Call Spread';
          }
        } else if (optionType === 'Puts') {
          if (leg1.action === 'Buy' && leg2.action === 'Sell') { // Buy low-strike Put, Sell high-strike Put
            name = 'Bull Put Spread';
          } else if (leg1.action === 'Sell' && leg2.action === 'Buy') { // Sell low-strike Put, Buy high-strike Put
            name = 'Bear Put Spread';
          }
        }
      }
    } else if (optionType === 'Mixed') { // Mixed Calls and Puts
      // Filter out invalid strikes for sorting and unique check
      const validStrikes = legs.map(leg => parseFloat(leg.strike)).filter(s => !isNaN(s) && s > 0);
      const uniqueValidStrikes = [...new Set(validStrikes)];

      if (uniqueValidStrikes.length === 1) {
        name = 'Straddle';
        type = 'Combination';
      } else if (uniqueValidStrikes.length === 2) {
        name = 'Strangle';
        type = 'Combination';
      }
    }
  } else if (numLegs === 4) {
    if (optionType === 'Mixed' && uniqueStrikes.length === 4) {
      // Iron Condor or Reverse Iron Condor
      const sortedLegs = [...legs].sort((a, b) => parseFloat(a.strike) - parseFloat(b.strike));
      const outerBuys = (sortedLegs[0].action === 'Buy' && sortedLegs[3].action === 'Buy');
      const innerSells = (sortedLegs[1].action === 'Sell' && sortedLegs[2].action === 'Sell');

      if (outerBuys && innerSells) {
        name = 'Reverse Iron Condor';
        isReverse = true;
      } else {
        name = 'Iron Condor';
      }
      type = 'Condor';
    } else if (optionType !== 'Mixed' && uniqueStrikes.length === 3) {
      // Butterfly
      const middleStrikeCount = legs.filter(leg => parseFloat(leg.strike) === uniqueStrikes[1]).length;
      if (middleStrikeCount === 2) {
        type = 'Butterfly';
        const outerLegs = legs.filter(leg => parseFloat(leg.strike) === uniqueStrikes[0] || parseFloat(leg.strike) === uniqueStrikes[2]);
        if (outerLegs.every(leg => leg.action === 'Buy')) {
          name = `Long ${optionType} Butterfly`;
        } else if (outerLegs.every(leg => leg.action === 'Sell')) {
          name = `Short ${optionType} Butterfly`;
        }
      }
    } else if (optionType !== 'Mixed' && uniqueStrikes.length === 4) {
      // Condor
      type = 'Condor';
      const sortedLegs = [...legs].sort((a, b) => parseFloat(a.strike) - parseFloat(b.strike));
      const outerBuys = (sortedLegs[0].action === 'Buy' && sortedLegs[3].action === 'Buy');
      const innerSells = (sortedLegs[1].action === 'Sell' && sortedLegs[2].action === 'Sell');

      if (outerBuys && innerSells) {
        name = `Reverse ${optionType} Condor`;
        isReverse = true;
      } else {
        name = `${optionType} Condor`;
      }
    }
  }

  return { name, type, direction, isCredit, isReverse, optionType };
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
      roi: 0,
      strategyName: 'N/A',
      strategyType: 'N/A',
      direction: 'N/A',
      isCredit: false,
      isReverse: false,
      optionType: 'N/A',
    };
  }

  const strategyDetails = detectStrategy(legs);
  let netPremium = 0;

  // Calculate net premium based on the formula: Sum of (Premium × Quantity × +1 for Sell, −1 for Buy)
  legs.forEach(leg => {
    const premium = parseFloat(leg.premium) || 0;
    const contracts = parseInt(leg.contracts) || 1;
    netPremium += premium * contracts * (leg.action === 'Sell' ? 1 : -1);
  });

  // Determine a reasonable price range for simulation
  const strikes = legs.map(leg => parseFloat(leg.strike) || 0).filter(strike => strike > 0);
  const minStrike = strikes.length > 0 ? Math.min(...strikes) : 10;
  const maxStrike = strikes.length > 0 ? Math.max(...strikes) : 100;

  const priceRangeStart = Math.max(0, minStrike * 0.5);
  const priceRangeEnd = maxStrike * 1.5;
  const priceStep = (priceRangeEnd - priceRangeStart) / 500; // Simulate 500 points

  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  const pnlCurve = [];

  for (let price = priceRangeStart; price <= priceRangeEnd; price += priceStep) {
    const pnl = calculateStrategyPayoff(legs, price);
    pnlCurve.push({ price, pnl });
    if (pnl > maxProfit) {
      maxProfit = pnl;
    }
    if (pnl < maxLoss) {
      maxLoss = pnl;
    }
  }

  // Find breakeven points by checking for sign changes in PnL
  const breakevens = [];
  for (let i = 0; i < pnlCurve.length - 1; i++) {
    const p1 = pnlCurve[i];
    const p2 = pnlCurve[i + 1];

    if ((p1.pnl <= 0 && p2.pnl > 0) || (p1.pnl >= 0 && p2.pnl < 0)) {
      // Linear interpolation to find the exact breakeven point
      const breakevenPrice = p1.price - p1.pnl * (p2.price - p1.price) / (p2.pnl - p1.pnl);
      if (breakevenPrice >= 0) { // Ensure breakeven is not negative
        breakevens.push(breakevenPrice);
      }
    }
  }

  // Remove duplicates and sort breakevens
  const uniqueBreakevens = [...new Set(breakevens.map(b => parseFloat(b.toFixed(2))))].sort((a, b) => a - b);

  // Handle "Unlimited" profit/loss for single legs
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.action === 'Buy' && leg.type === 'Call') {
      maxProfit = 'Unlimited';
    } else if (leg.action === 'Sell' && leg.type === 'Call') {
      maxLoss = 'Unlimited';
    } else if (leg.action === 'Buy' && leg.type === 'Put') {
      // Max profit for long put is strike - premium, if price goes to 0
      maxProfit = Math.max(0, (parseFloat(leg.strike) || 0) - (parseFloat(leg.premium) || 0)) * (parseInt(leg.contracts) || 1);
    } else if (leg.action === 'Sell' && leg.type === 'Put') {
      // Max loss for naked put is strike - premium, if price goes to 0
      maxLoss = Math.max(0, (parseFloat(leg.strike) || 0) - (parseFloat(leg.premium) || 0)) * (parseInt(leg.contracts) || 1);
    }
  }

  // Calculate ROI
  let roi = 0;
  if (marginRequired && marginRequired !== 0) {
    roi = (netPremium / marginRequired) * 100;
  }

  // Probability of profit is complex and requires implied volatility,
  // which is beyond the scope of this current calculation.
  // Returning 'N/A' or a placeholder for now.
  const probProfit = 'N/A'; 

  const explanations = getSimplifiedExplanation(
    { strategyName: strategyDetails.name, strategyType: strategyDetails.type }, // Pass relevant metrics
    legs
  );

  return {
    netPremium: parseFloat(netPremium.toFixed(2)),
    maxProfit: maxProfit === 'Unlimited' ? maxProfit : parseFloat(maxProfit.toFixed(2)),
    maxLoss: maxLoss === 'Unlimited' ? maxLoss : parseFloat(maxLoss.toFixed(2)),
    breakevens: uniqueBreakevens,
    probProfit,
    roi: parseFloat(roi.toFixed(2)),
    strategyName: strategyDetails.name,
    strategyType: strategyDetails.type,
    direction: strategyDetails.direction,
    isCredit: strategyDetails.isCredit,
    isReverse: strategyDetails.isReverse,
    optionType: strategyDetails.optionType,
    maxProfitExplanation: explanations.maxProfitExplanation, // Add this
    maxLossExplanation: explanations.maxLossExplanation,     // Add this
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

/**
 * Generates simplified explanations for max profit and max loss scenarios.
 * @param {import('../components/StrategyForm').StrategyMetrics} metrics - The calculated strategy metrics.
 * @param {Array<import('../components/Leg').LegValues>} legs - An array of leg objects.
 * @returns {{maxProfitExplanation: string, maxLossExplanation: string}} Explanations for profit and loss.
 */
export const getSimplifiedExplanation = (metrics, legs) => {
  const explanations = {
    maxProfitExplanation: '',
    maxLossExplanation: '',
  };

  const assetPlaceholder = 'the asset'; // Default placeholder

  // Helper to get sorted unique valid strikes
  const getSortedUniqueStrikes = (legs) => {
    return [...new Set(legs.map(leg => parseFloat(leg.strike)).filter(s => !isNaN(s) && s > 0))].sort((a, b) => a - b);
  };

  const sortedStrikes = getSortedUniqueStrikes(legs);
  const lowerStrike = sortedStrikes[0];
  const higherStrike = sortedStrikes[sortedStrikes.length - 1];
  const middleStrike = sortedStrikes.length === 3 ? sortedStrikes[1] : null; // For butterflies/condors with 3 unique strikes

  // For Condors and Butterflies with 4 legs, need to identify specific strikes
  let strike1, strike2, strike3, strike4;
  if (legs.length === 4) {
    const sortedLegs = [...legs].sort((a, b) => parseFloat(a.strike) - parseFloat(b.strike));
    strike1 = parseFloat(sortedLegs[0].strike);
    strike2 = parseFloat(sortedLegs[1].strike);
    strike3 = parseFloat(sortedLegs[2].strike);
    strike4 = parseFloat(sortedLegs[3].strike);
  }


  switch (metrics.strategyName) {
    case 'Naked Call':
      explanations.maxProfitExplanation = `You get max profit when ${assetPlaceholder} stays below strike.`;
      explanations.maxLossExplanation = `You get max loss when ${assetPlaceholder} rises far above strike.`;
      break;
    case 'Naked Put':
      explanations.maxProfitExplanation = `You get max profit when ${assetPlaceholder} stays above strike.`;
      explanations.maxLossExplanation = `You get max loss when ${assetPlaceholder} drops to zero.`;
      break;
    case 'Long Call':
      explanations.maxProfitExplanation = `You get max profit when ${assetPlaceholder} rises well above strike.`;
      explanations.maxLossExplanation = `You get max loss when ${assetPlaceholder} stays below strike.`;
      break;
    case 'Long Put':
      explanations.maxProfitExplanation = `You get max profit when ${assetPlaceholder} drops well below strike.`;
      explanations.maxLossExplanation = `You get max loss when ${assetPlaceholder} stays above strike.`;
      break;
    case 'Bull Call Spread':
      explanations.maxProfitExplanation = `You get max profit when price ends above higher strike (${higherStrike ? `$${higherStrike.toFixed(2)}` : 'higher strike'}).`;
      explanations.maxLossExplanation = `You get max loss when price stays below lower strike (${lowerStrike ? `$${lowerStrike.toFixed(2)}` : 'lower strike'}).`;
      break;
    case 'Bear Put Spread':
      explanations.maxProfitExplanation = `You get max profit when price stays above higher strike (${higherStrike ? `$${higherStrike.toFixed(2)}` : 'higher strike'}).`;
      explanations.maxLossExplanation = `You get max loss when price drops below lower strike (${lowerStrike ? `$${lowerStrike.toFixed(2)}` : 'lower strike'}).`;
      break;
    case 'Bear Call Spread':
      explanations.maxProfitExplanation = `You get max profit when price stays below lower strike (${lowerStrike ? `$${lowerStrike.toFixed(2)}` : 'lower strike'}).`;
      explanations.maxLossExplanation = `You get max loss when price rises above higher strike (${higherStrike ? `$${higherStrike.toFixed(2)}` : 'higher strike'}).`;
      break;
    case 'Bull Put Spread':
      explanations.maxProfitExplanation = `You get max profit when price stays above higher strike (${higherStrike ? `$${higherStrike.toFixed(2)}` : 'higher strike'}).`;
      explanations.maxLossExplanation = `You get max loss when price drops below lower strike (${lowerStrike ? `$${lowerStrike.toFixed(2)}` : 'lower strike'}).`;
      break;
    case 'Iron Condor':
      explanations.maxProfitExplanation = `You get max profit when price stays between short strikes (${strike2 ? `$${strike2.toFixed(2)}` : 'short strike 2'} and ${strike3 ? `$${strike3.toFixed(2)}` : 'short strike 3'}).`;
      explanations.maxLossExplanation = `You get max loss when price goes below or above long wings (${strike1 ? `$${strike1.toFixed(2)}` : 'long wing 1'} or ${strike4 ? `$${strike4.toFixed(2)}` : 'long wing 4'}).`;
      break;
    case 'Reverse Iron Condor':
      explanations.maxProfitExplanation = `You get max profit when price moves sharply outside short strikes (${strike2 ? `$${strike2.toFixed(2)}` : 'short strike 2'} or ${strike3 ? `$${strike3.toFixed(2)}` : 'short strike 3'}).`;
      explanations.maxLossExplanation = `You get max loss when price stays between middle strikes (${strike2 ? `$${strike2.toFixed(2)}` : 'middle strike 2'} and ${strike3 ? `$${strike3.toFixed(2)}` : 'middle strike 3'}).`;
      break;
    case 'Long Call Butterfly':
    case 'Long Put Butterfly':
      explanations.maxProfitExplanation = `You get max profit when price ends exactly at middle strike (${middleStrike ? `$${middleStrike.toFixed(2)}` : 'middle strike'}).`;
      explanations.maxLossExplanation = `You get max loss when price ends outside wings (${lowerStrike ? `$${lowerStrike.toFixed(2)}` : 'lower strike'} or ${higherStrike ? `$${higherStrike.toFixed(2)}` : 'higher strike'}).`;
      break;
    case 'Short Call Butterfly':
    case 'Short Put Butterfly':
      explanations.maxProfitExplanation = `You get max profit when price ends outside wings (${lowerStrike ? `$${lowerStrike.toFixed(2)}` : 'lower strike'} or ${higherStrike ? `$${higherStrike.toFixed(2)}` : 'higher strike'}).`;
      explanations.maxLossExplanation = `You get max loss when price ends exactly at middle strike (${middleStrike ? `$${middleStrike.toFixed(2)}` : 'middle strike'}).`;
      break;
    case 'Put Condor':
    case 'Call Condor':
      explanations.maxProfitExplanation = `You get max profit when price ends near middle strikes.`; // Need more specific strikes for this
      explanations.maxLossExplanation = `You get max loss when price moves beyond wings.`; // Need more specific strikes for this
      break;
    default:
      explanations.maxProfitExplanation = '';
      explanations.maxLossExplanation = '';
      break;
  }

  return explanations;
};
