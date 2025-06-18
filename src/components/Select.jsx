import React from 'react';

/**
 * @typedef {object} SelectProps
 * @property {React.ReactNode} children - The options for the select dropdown.
 * @property {string} [className] - Additional CSS classes for the select.
 * @property {string} [id] - The ID of the select element.
 * @property {string} [label] - The label text for the select.
 * @property {'top' | 'left'} [labelPosition='top'] - Position of the label relative to the select.
 * @property {string} ['aria-label'] - Accessible label for screen readers.
 */

/**
 * A reusable Select component with basic styling and accessibility features.
 * @param {SelectProps} props - The component props.
 * @param {React.Ref<HTMLSelectElement>} ref - The ref for the select element.
 * @returns {JSX.Element}
 */
const Select = React.forwardRef(({ 
  children, 
  className,
  id,
  label,
  labelPosition = "top",
  "aria-label": ariaLabel,
  ...props 
}, ref) => {
  // Generate a unique ID if one wasn't provided
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  // If no aria-label is provided but a label is, use the label text
  const accessibilityLabel = ariaLabel || label;

  return (
    <div className={`w-full ${labelPosition === 'left' ? 'flex items-center gap-2' : ''}`}>
      {label && (
        <label 
          htmlFor={selectId}
          className={`block text-sm font-medium text-[#C9D1D9] ${labelPosition === 'top' ? 'mb-2' : 'min-w-[120px]'}`}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={`select-field focus:ring focus:ring-green-500 focus:ring-offset-2 ${className || ''}`}
        aria-label={accessibilityLabel}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
