"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Label } from "@/components/ui/label";

export interface PasswordConfirmInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
}

const PasswordConfirmInput = React.forwardRef<
  HTMLDivElement,
  PasswordConfirmInputProps
>(
  (
    {
      password,
      confirmPassword,
      onPasswordChange,
      onConfirmChange,
      className,
      ...props
    },
    ref
  ) => {
    const [shakeConfirm, setShakeConfirm] = useState(false);
    const [showRequirementError, setShowRequirementError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Dynamic state strength calculators
    const checkStrength = (pass: string) => {
      const requirements = [
        { regex: /.{8,}/, text: "At least 8 characters" },
        { regex: /[0-9]/, text: "At least 1 number" },
        { regex: /[a-z]/, text: "At least 1 lowercase letter" },
        { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
      ];

      return requirements.map((req) => ({
        met: req.regex.test(pass),
        text: req.text,
      }));
    };

    const strength = checkStrength(password);

    const strengthScore = useMemo(() => {
      return strength.filter((req) => req.met).length;
    }, [strength]);

    const getStrengthColor = (score: number) => {
      if (score === 0) return "bg-border";
      if (score <= 1) return "bg-muted-foreground/30";
      if (score <= 2) return "bg-muted-foreground/60";
      if (score === 3) return "bg-muted-foreground";
      return "bg-primary";
    };

    const getStrengthText = (score: number) => {
      if (score === 0) return "Enter a password";
      if (score <= 2) return "Weak password";
      if (score === 3) return "Medium password";
      return "Strong password";
    };

    // Confirm shrink handler
    useEffect(() => {
      if (strengthScore < 4 && confirmPassword.length > 0) {
        onConfirmChange("");
      } else if (confirmPassword.length > password.length) {
        onConfirmChange(confirmPassword.slice(0, password.length));
      }
    }, [password, strengthScore, confirmPassword, onConfirmChange]);

    const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (strengthScore < 4) {
        setShakeConfirm(true);
        setShowRequirementError(true);
        return;
      }
      
      setShowRequirementError(false);
      const val = e.target.value;
      if (val.length > password.length && password.length > 0) {
        setShakeConfirm(true);
        return;
      }
      onConfirmChange(val);
    };

    useEffect(() => {
      if (shakeConfirm) {
        const timer = setTimeout(() => {
          setShakeConfirm(false);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [shakeConfirm]);
    
    const displayRequirementError = showRequirementError && strengthScore < 4;

    return (
      <div
        ref={ref}
        className={`flex w-full flex-col text-foreground ${className || ""}`}
        {...props}
      >
        <div className="space-y-2 mb-4">
          <Label>Password Setup</Label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-border bg-background pl-2 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 pr-10"
              aria-invalid={strengthScore < 4}
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          {/* Strength Meter Bar */}
          <div
            className="mb-2 h-1 w-full overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={strengthScore}
            aria-valuemin={0}
            aria-valuemax={4}
          >
            <div
              className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
              style={{ width: `${(strengthScore / 4) * 100}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center mb-2 text-xs font-medium text-foreground">
            <span>Must contain:</span>
            <span>{getStrengthText(strengthScore)}</span>
          </div>

          <ul className="space-y-1.5 mb-2 text-left">
            {strength.map((req, index) => (
              <li key={index} className="flex items-center gap-2">
                {req.met ? (
                  <Check size={14} className="text-primary" />
                ) : (
                  <X size={14} className="text-destructive/50" />
                )}
                <span className={`text-xs ${req.met ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {req.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Label className="mb-2 text-left">Confirm Password</Label>

        {/* Matcher Grid */}
        <div className="mb-3 flex w-full space-x-1">
          {password.length === 0 ? (
            <div className="h-2 w-full rounded-full border border-border bg-muted/30" />
          ) : (
            Array.from({ length: password.length }).map((_, i) => {
              let blockColor = "border-border bg-muted/30"; // Neutral base
              if (i < confirmPassword.length) {
                if (confirmPassword[i] === password[i]) {
                  blockColor = "border-primary bg-primary";
                } else {
                  blockColor = "border-destructive bg-destructive";
                }
              }

              return (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full border transition-colors duration-200 ${blockColor}`}
                />
              );
            })
          )}
        </div>

        {/* Confirm */}
        <motion.div
           animate={{ x: shakeConfirm ? [-8, 8, -8, 8, 0] : 0 }}
           transition={{ duration: 0.4 }}
           className="relative"
        >
          <input
            type="password"
            placeholder="Re-type your password"
            value={confirmPassword}
            onChange={handleConfirmChange}
            className={`flex h-9 w-full rounded-lg border bg-background pl-2 py-2 text-sm text-foreground shadow-sm shadow-black/5 outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 pr-10 cursor-text ${shakeConfirm ? 'border-destructive focus-visible:ring-destructive/20' : 'border-border'}`}
          />
        </motion.div>

        {displayRequirementError && (
          <motion.span
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive mt-2 font-medium"
          >
            Please fulfill all password requirements first.
          </motion.span>
        )}
      </div>
    );
  }
);

PasswordConfirmInput.displayName = "PasswordConfirmInput";

export default PasswordConfirmInput;
