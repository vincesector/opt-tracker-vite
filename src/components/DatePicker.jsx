import React from 'react';
import Input from './Input';

/**
 * @typedef {object} DatePickerProps
 * @property {string} [className] - Additional CSS classes for the input.
 * @property {string} [value] - The current value of the date input.
 * @property {function} [onChange] - The function to call when the date changes.
 * // ...other input props
 */

/**
 * A custom DatePicker component with a calendar icon.
 * @param {DatePickerProps} props - The component props.
 * @param {React.Ref<HTMLInputElement>} ref - The ref for the input element.
 * @returns {JSX.Element}
 */
const DatePicker = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <Input
        type="date"
        className={`input-field ${className || ''}`}
        ref={ref}
        {...props}
      />
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;
