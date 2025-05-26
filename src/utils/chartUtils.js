import { Chart } from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(annotationPlugin);

const colors = {
  profit: '#00A67E',
  loss: '#F85149',
  grid: '#30363D',
  text: '#8B949E',
  breakeven: '#388BFD',
  annotations: '#8B949E'
};

/**
 * Generates points for a hockey stick payoff diagram with extra points around strike prices for smoother curves
 * @param {Array<import('../components/Leg').LegValues>} legs - The option legs
 * @param {number} startPrice - The starting price for the chart
 * @param {number} endPrice - The ending price for the chart
 * @param {number} step - The step size between price points
 * @returns {Array<{x: number, y: number}>} Array of price and payoff points
 */
const generatePayoffPoints = (legs, startPrice, endPrice, step) => {
  const points = new Set(); // Use Set to avoid duplicate x values
  const strikes = legs.map(leg => parseFloat(leg.strike)).filter(strike => !isNaN(strike));
  
  // Generate points with special attention around strikes
  for (let price = startPrice; price <= endPrice; price += step) {
    // Add extra points slightly before and after each strike price
    strikes.forEach(strike => {
      if (Math.abs(price - strike) < step) {
        [-0.5, -0.1, 0, 0.1, 0.5].forEach(offset => {
          const strikePoint = strike + offset;
          if (strikePoint >= startPrice && strikePoint <= endPrice) {
            points.add(strikePoint);
          }
        });
      }
    });
    points.add(price);
  }

  // Sort prices and calculate payoffs
  return Array.from(points).sort((a, b) => a - b).map(price => {
    let totalPayoff = 0;
    legs.forEach(leg => {
      const strike = parseFloat(leg.strike);
      const premium = parseFloat(leg.premium);
      const contracts = parseInt(leg.contracts) || 1;
      
      if (leg.type === 'Put') {
        const intrinsicValue = Math.max(0, strike - price);
        totalPayoff += leg.action === 'Buy' 
          ? (intrinsicValue - premium) * contracts
          : (premium - intrinsicValue) * contracts;
      } else {
        const intrinsicValue = Math.max(0, price - strike);
        totalPayoff += leg.action === 'Buy'
          ? (intrinsicValue - premium) * contracts
          : (premium - intrinsicValue) * contracts;
      }
    });
    return { x: price, y: totalPayoff };
  });
};

export const initChart = (chartContainer) => {
  const ctx = chartContainer.getContext('2d');
  Chart.defaults.font.family = 'Inter, sans-serif';
  
  return new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Strategy P/L',
        data: [],
        showLine: true,
        borderColor: colors.profit,
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      interaction: {
        intersect: false,
        mode: 'nearest'
      },
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Underlying Price at Expiration',
            color: colors.text,
            padding: 10
          },
          grid: {
            color: colors.grid,
            lineWidth: 0.5,
            drawBorder: false
          },
          ticks: {
            color: colors.text,
            callback: (value) => '$' + value
          }
        },
        y: {
          title: {
            display: true,
            text: 'Profit or Loss at Expiration',
            color: colors.text,
            padding: 10
          },
          grid: {
            color: colors.grid,
            lineWidth: 0.5,
            drawBorder: false
          },
          ticks: {
            color: colors.text,
            callback: (value) => '$' + value
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: false,
          backgroundColor: '#161B22',
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.grid,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 4,
          displayColors: false,
          callbacks: {
            title: (tooltipItems) => {
              return 'Strategy P/L';
            },
            label: (context) => {
              const price = context.parsed.x.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
              });
              const pl = context.parsed.y.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                signDisplay: 'always'
              });
              return [
                `Price: ${price}`,
                `P/L: ${pl}`
              ];
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Underlying Price at Expiration',
              color: colors.text,
              padding: 10,
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              color: colors.grid,
              lineWidth: 0.5,
              drawBorder: false
            },
            ticks: {
              color: colors.text,
              callback: (value) => value.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }),
              maxRotation: 0
            }
          },
          y: {
            title: {
              display: true,
              text: 'Profit or Loss at Expiration',
              color: colors.text,
              padding: 10,
              font: {
                size: 12,
                weight: 'bold'
              }
            },
            grid: {
              color: colors.grid,
              lineWidth: 0.5,
              drawBorder: false
            },
            ticks: {
              color: colors.text,
              callback: (value) => value.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                signDisplay: 'always'
              })
            }
          }
        }
      }
    }
  });
};

export const updatePayoffChart = (chart, legs, assetPrice) => {
  if (!chart || !legs || legs.length === 0 || !assetPrice) return;

  // Get min and max strikes to determine chart range
  const strikes = legs.map(leg => parseFloat(leg.strike)).filter(strike => !isNaN(strike));
  const minStrike = Math.min(...strikes);
  const maxStrike = Math.max(...strikes);
  
  // Add 100-point margin on both sides
  const startPrice = Math.max(0, minStrike - 100);
  const endPrice = maxStrike + 100;
  const step = (endPrice - startPrice) / 200; // More granular steps for smoother curve
  
  // Generate payoff points
  const payoffPoints = generatePayoffPoints(legs, startPrice, endPrice, step);

  // Update chart data
  chart.data.datasets[0].data = payoffPoints;

  // Add annotations for key points
  const annotations = {};

  // Max Profit line
  const maxProfit = Math.max(...payoffPoints.map(p => p.y));
  annotations.maxProfit = {
    type: 'line',
    yMin: maxProfit,
    yMax: maxProfit,
    borderColor: colors.profit,
    borderWidth: 1,
    borderDash: [5, 5],
    label: {
      content: `Max Profit: $${maxProfit.toFixed(2)}`,
      enabled: true,
      position: 'right'
    }
  };

  // Max Loss line
  const maxLoss = Math.min(...payoffPoints.map(p => p.y));
  annotations.maxLoss = {
    type: 'line',
    yMin: maxLoss,
    yMax: maxLoss,
    borderColor: colors.loss,
    borderWidth: 1,
    borderDash: [5, 5],
    label: {
      content: `Max Loss: $${maxLoss.toFixed(2)}`,
      enabled: true,
      position: 'right'
    }
  };

  // Zero line
  annotations.zeroLine = {
    type: 'line',
    yMin: 0,
    yMax: 0,
    borderColor: colors.grid,
    borderWidth: 1
  };

  // Strike price lines
  strikes.forEach((strike, index) => {
    annotations[`strike${index}`] = {
      type: 'line',
      xMin: strike,
      xMax: strike,
      borderColor: colors.annotations,
      borderWidth: 1,
      borderDash: [5, 5],
      label: {
        content: `Strike: $${strike}`,
        enabled: true,
        position: 'top',
        backgroundColor: '#161B22',
        font: {
          size: 11,
          weight: 'bold'
        },
        padding: 6,
        borderRadius: 4
      }
    };
  });

  // Breakeven points
  payoffPoints.reduce((crossings, point, i) => {
    if (i > 0) {
      const prev = payoffPoints[i - 1];
      // Check if the line crosses y=0 between these points
      if ((prev.y <= 0 && point.y >= 0) || (prev.y >= 0 && point.y <= 0)) {
        // Linear interpolation to find x value where y=0
        const ratio = Math.abs(prev.y) / (Math.abs(prev.y) + Math.abs(point.y));
        const breakeven = prev.x + (point.x - prev.x) * ratio;
        
        annotations[`breakeven${crossings}`] = {
          type: 'line',
          xMin: breakeven,
          xMax: breakeven,
          borderColor: colors.breakeven,
          borderWidth: 2,
          label: {
            content: `Break Even: $${breakeven.toFixed(2)}`,
            enabled: true,
            position: 'bottom',
            backgroundColor: '#161B22',
            color: colors.breakeven,
            font: {
              size: 11,
              weight: 'bold'
            },
            padding: 6,
            borderRadius: 4
          }
        };
        return crossings + 1;
      }
    }
    return crossings;
  }, 0);

  chart.options.plugins.annotation = { annotations };
  chart.update();
};
