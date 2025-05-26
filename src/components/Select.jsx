import React from 'react';

/**
 * @typedef {object} SelectProps
 * @property {React.ReactNode} children - The options for the select dropdown.
 * @property {string} [className] - Additional CSS classes for the select.
 * // ...other select props
 */

/**
 * A reusable Select component with a dropdown icon.
 * @param {SelectProps} props - The component props.
 * @param {React.Ref<HTMLSelectElement>} ref - The ref for the select element.
 * @returns {JSX.Element}
 */
const Select = React.forwardRef(({ children, className, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <select
        className={`select-field ${className || ''}`}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8B949E]">arrow_drop_down</span>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
