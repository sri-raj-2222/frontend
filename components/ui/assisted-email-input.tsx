import * as React from "react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export interface EmailInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  inputPlaceholder?: string;
}

// Standard email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const AssistedEmailInput = React.forwardRef<
  HTMLDivElement,
  EmailInputProps
>(
  (
    {
      value,
      onChange,
      inputPlaceholder = "Enter Email",
      className,
      ...props
    },
    ref
  ) => {
    const [shake, setShake] = useState(false);
    const [valid, setValid] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const trimmedVal = val.trim();
      onChange(val);

      if (trimmedVal.length > 3 && !emailRegex.test(trimmedVal)) {
        setShake(true);
      }

      setValid(emailRegex.test(trimmedVal));
    };

    useEffect(() => {
      if (shake) {
        const timer = setTimeout(() => setShake(false), 500);
        return () => clearTimeout(timer);
      }
    }, [shake]);

    const bounceAnimation = {
      x: shake ? [-10, 10, -10, 10, 0] : 0,
      transition: { duration: 0.5 },
    };

    const borderAnimation = {
      borderColor: valid
        ? "var(--primary)"
        : "var(--border)",
      transition: { duration: 0.3 },
    };

    return (
      <div
        ref={ref}
        className={`flex w-full flex-col items-start justify-center text-foreground ${className || ''}`}
        {...props}
      >
        <span className="text-sm font-medium leading-none mb-2">
          Email
        </span>

        <motion.input
          className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
          type="email"
          placeholder={inputPlaceholder}
          value={value}
          onChange={handleInputChange}
          animate={{ ...bounceAnimation, ...borderAnimation }}
        />

        {value.length > 0 && (
          <span
            className={`mt-1 text-xs ${
              valid ? "text-primary" : "text-destructive"
            }`}
          >
            {valid
              ? "Valid Email"
              : "Enter a valid email address"}
          </span>
        )}
      </div>
    );
  }
);

AssistedEmailInput.displayName = "AssistedEmailInput";

export default AssistedEmailInput;
