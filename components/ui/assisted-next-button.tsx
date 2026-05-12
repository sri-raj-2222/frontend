import * as React from "react";
import { motion } from "framer-motion";

export interface NextButtonProps {
  enabled?: boolean;
  label?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const NextButton = React.forwardRef<
  HTMLButtonElement,
  NextButtonProps
>(
  (
    {
      enabled = false,
      label = "Next",
      onClick,
      type = "button",
      className,
    },
    ref
  ) => {

    const animation = {
      scale: enabled ? [1, 1.03, 1] : 1,
      transition: { duration: 0.3 }
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={!enabled}
        onClick={onClick}
        className={`
          mt-4 h-[48px] w-full rounded-xl 
          bg-slate-900 text-white font-semibold
          transition-all duration-300
          disabled:bg-slate-300 disabled:text-slate-500
          ${className || ""}
        `}
        animate={animation}
        whileTap={{ scale: enabled ? 0.97 : 1 }}
      >
        {label}
      </motion.button>
    );
  }
);

NextButton.displayName = "NextButton";

export default NextButton;
