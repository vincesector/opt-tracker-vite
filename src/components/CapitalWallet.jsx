import React from 'react';

export default function CapitalWallet({ capital, prices, showNative }) {
  // Calculate total USD value
  const totalUSD = capital.reduce((sum, asset) => {
    const price = prices?.[asset.asset] || 0;
    return sum + (asset.amount * price);
  }, 0);

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Capital Wallet</h2>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr>
            <th className="table-header">Asset</th>
            <th className="table-header">Amount</th>
            <th className="table-header">Current Price (USD)</th>
            <th className="table-header">Value</th>
          </tr>
        </thead>
        <tbody>
          {capital.length === 0 && (
            <tr>
              <td colSpan={4} className="table-cell text-center text-[#8B949E]">No assets in wallet.</td>
            </tr>
          )}
          {capital.map((row, idx) => (
            <tr key={idx}>
              <td className="table-cell">{row.asset}</td>
              <td className="table-cell">{row.amount}</td>
              <td className="table-cell">{prices?.[row.asset]?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) ?? '-'}</td>
              <td className="table-cell">
                {showNative
                  ? `${row.amount} ${row.asset}`
                  : (row.amount * (prices?.[row.asset] || 0)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="font-semibold text-right text-lg">
        Total Wallet Value: <span className="text-emerald-400">
          {showNative
            ? capital.map(a => `${a.amount} ${a.asset}`).join(' + ')
            : totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </span>
      </div>
    </div>
  );
}
