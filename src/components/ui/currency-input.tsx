import * as React from "react";
import { Input, InputProps } from "@/components/ui/input";
import {
  formatCurrencyInputValue,
  parseCurrencyInput,
} from "@/lib/finance/currency-input";

export interface CurrencyInputProps
  extends Omit<InputProps, "inputMode" | "onChange" | "type" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ onValueChange, value, ...props }, ref) => (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      value={formatCurrencyInputValue(value)}
      onChange={(event) => onValueChange(parseCurrencyInput(event.target.value))}
    />
  ),
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
