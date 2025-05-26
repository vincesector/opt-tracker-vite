import React from 'react';

/**
 * @typedef {object} InputProps
 * @property {string} [className] - Additional CSS classes for the input.
 * @property {string} [type='text'] - The type of the input (e.g., 'text', 'number', 'date').
 * // ...other input props
 */

/**
 * A reusable Input component with basic styling.
 * @param {InputProps} props - The component props.
 * @param {React.Ref<HTMLInputElement>} ref - The ref for the input element.
 * @returns {JSX.Element}
 */
const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={`input-field placeholder-[#8B949E] ${className || ''}`}
      step={type === 'number' ? '0.01' : undefined}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
