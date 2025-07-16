import React, { useState } from 'react';

const ASSET_OPTIONS = [
  { label: 'USDC', value: 'USDC' },
  { label: 'ETH', value: 'ETH' },
  { label: 'BTC', value: 'BTC' },
  { label: 'SOL', value: 'SOL' },
];

export default function CapitalSetupPanel({ capital, setCapital }) {
  const [newAsset, setNewAsset] = useState('USDC');
  const [newAmount, setNewAmount] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');

  const handleAdd = () => {
    if (!newAmount || isNaN(newAmount) || Number(newAmount) <= 0) return;
    setCapital([
      ...capital,
      {
        asset: newAsset,
        amount: parseFloat(newAmount),
        purchasePrice: newPurchasePrice ? parseFloat(newPurchasePrice) : undefined,
      },
    ]);
    setNewAmount('');
    setNewPurchasePrice('');
  };

  const handleRemove = idx => {
    setCapital(capital.filter((_, i) => i !== idx));
  };

  return (
    <div className="card p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Capital Setup</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="select-field w-32"
          value={newAsset}
          onChange={e => setNewAsset(e.target.value)}
        >
          {ASSET_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          className="input-field w-32"
          type="number"
          min="0"
          step="any"
          placeholder="Amount"
          value={newAmount}
          onChange={e => setNewAmount(e.target.value)}
        />
        <input
          className="input-field w-40"
          type="number"
          min="0"
          step="any"
          placeholder="Purchase Price (USD)"
          value={newPurchasePrice}
          onChange={e => setNewPurchasePrice(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleAdd} type="button">
          Add Asset
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header">Asset</th>
            <th className="table-header">Amount</th>
            <th className="table-header">Purchase Price (USD)</th>
            <th className="table-header"></th>
          </tr>
        </thead>
        <tbody>
          {capital.length === 0 && (
            <tr>
              <td colSpan={4} className="table-cell text-center text-[#8B949E]">No assets added yet.</td>
            </tr>
          )}
          {capital.map((row, idx) => (
            <tr key={idx}>
              <td className="table-cell">{row.asset}</td>
              <td className="table-cell">{row.amount}</td>
              <td className="table-cell">{row.purchasePrice ?? '-'}</td>
              <td className="table-cell">
                <button className="btn btn-danger" onClick={() => handleRemove(idx)} title="Remove">
                  <span className="material-icons text-sm">close</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
