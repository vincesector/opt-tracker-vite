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
        className={`input-field pr-10 ${className || ''}`}
        ref={ref}
        {...props}
      />
      <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] pointer-events-none select-none">
        calendar_today
      </span>
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

export default DatePicker;
