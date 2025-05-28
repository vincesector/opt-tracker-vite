import React from 'react';
import Select from './Select';
import Input from './Input';

/**
 * @typedef {object} LegValues
 * @property {string} action - The action (Buy or Sell).
 * @property {string} type - The option type (Call or Put).
 * @property {number} strike - The strike price.
 * @property {number} premium - The premium.
 * @property {number} contracts - The number of contracts.
 */

/**
 * @typedef {object} LegProps
 * @property {string | number} id - The unique identifier for the leg.
 * @property {boolean} isFirst - True if this is the first leg.
 * @property {function(): void} onDelete - Callback function to delete the leg.
 * @property {(id: string | number, values: LegValues) => void} onChange - Callback function when leg values change.
 * @property {LegValues} values - The current values of the leg.
 */

/**
 * Represents a single leg in an option strategy.
 * @param {LegProps} props - The component props.
 * @returns {JSX.Element}
 */
const Leg = ({ id, isFirst, onDelete, onChange, values }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(id, { ...values, [name]: value });
  };

  React.useEffect(() => {
    // Ensure parent always has up-to-date values
    onChange(id, values);
    // eslint-disable-next-line
  }, []);

  // Generate unique ids for form controls
  const inputIds = {
    action: `leg-${id}-action`,
    type: `leg-${id}-type`,
    strike: `leg-${id}-strike`,
    premium: `leg-${id}-premium`,
    contracts: `leg-${id}-contracts`
  };

  return (
    <div className="leg-container">
      <div className="leg-header">
        <h3 className="text-sm font-medium text-[#C9D1D9]">
          {`Leg ${String.fromCharCode(64 + parseInt(id))}`}
        </h3>
        {!isFirst && (
          <button 
            type="button"
            onClick={onDelete}
            className="btn btn-danger"
            aria-label="Delete leg"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label htmlFor={inputIds.action} className="block text-xs font-medium mb-1 text-[#8B949E]">Action</label>
          <Select 
            name="action" 
            id={inputIds.action}
            value={values.action} 
            onChange={handleChange} 
            className="select-field"
          >
            <option>Sell</option>
            <option>Buy</option>
          </Select>
        </div>
        <div>
          <label htmlFor={inputIds.type} className="block text-xs font-medium mb-1 text-[#8B949E]">Type</label>
          <Select 
            name="type" 
            id={inputIds.type}
            value={values.type} 
            onChange={handleChange} 
            className="select-field"
          >
            <option>Call</option>
            <option>Put</option>
          </Select>
        </div>
        <div>
          <label htmlFor={inputIds.strike} className="block text-xs font-medium mb-1 text-[#8B949E]">Strike</label>
          <Input 
            type="number" 
            name="strike" 
            id={inputIds.strike}
            value={values.strike} 
            onChange={handleChange} 
            placeholder="Strike price" 
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor={inputIds.premium} className="block text-xs font-medium mb-1 text-[#8B949E]">Premium</label>
          <Input 
            type="number" 
            name="premium" 
            id={inputIds.premium}
            value={values.premium} 
            onChange={handleChange} 
            placeholder="Premium" 
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor={inputIds.contracts} className="block text-xs font-medium mb-1 text-[#8B949E]">Contracts</label>
          <Input 
            type="number" 
            name="contracts" 
            id={inputIds.contracts}
            value={values.contracts} 
            min="1" 
            onChange={handleChange} 
            placeholder="No." 
            className="input-field"
          />
        </div>
      </div>
    </div>
  );
};

export default Leg;
