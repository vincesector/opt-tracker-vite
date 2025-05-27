import React from 'react';

/**
 * @typedef {object} InputProps
 * @property {string} [className] - Additional CSS classes for the input.
 * @property {string} [type='text'] - The type of the input (e.g., 'text', 'number', 'date').
 * @property {string} [id] - The ID of the input element.
 * @property {string} [label] - The label text for the input.
 * @property {'top' | 'left'} [labelPosition='top'] - Position of the label relative to the input.
 * @property {string} ['aria-label'] - Accessible label for screen readers.
 */

/**
 * A reusable Input component with basic styling and accessibility features.
 * @param {InputProps} props - The component props.
 * @param {React.Ref<HTMLInputElement>} ref - The ref for the input element.
 * @returns {JSX.Element}
 */
const Input = React.forwardRef(({ 
  className,
  type = "text",
  id,
  label,
  labelPosition = "top",
  "aria-label": ariaLabel,
  ...props 
}, ref) => {
  // Generate a unique ID if one wasn't provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // If no aria-label is provided but a label is, use the label text
  const accessibilityLabel = ariaLabel || label;

  return (
    <div className={`w-full ${labelPosition === 'left' ? 'flex items-center gap-2' : ''}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-medium ${
            labelPosition === 'top' ? 'mb-2' : 'min-w-[120px]'
          } text-[#C9D1D9]`}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`input-field placeholder-[#8B949E] ${className || ''}`}
        step={type === 'number' ? '0.01' : undefined}
        ref={ref}
        aria-label={accessibilityLabel}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
