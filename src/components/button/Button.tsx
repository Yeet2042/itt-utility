"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";

interface Props {
  children?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  maxWidth?: string; // e.g., '200px', '100%'
  color?: "brand" | "base";
  disabled?: boolean;
  onClick?: () => void;
}

export default function Button({
  children = "Hinghoi Button",
  startIcon,
  endIcon,
  maxWidth = "200px",
  color = "brand",
  disabled = false,
  onClick,
}: Props) {
  const backgroundColor = {
    brand: "#FCD326",
    base: "#181818",
  };

  const hoverColor = {
    brand: "#FABD1F",
    base: "#262626",
  };

  const activeColor = {
    brand: "#FABD1F",
    base: "#404040",
  };

  const disabledColor = {
    brand: "#FFF8C2",
    base: "#262626",
  };

  const borderColor = {
    brand: "#FCEA4D",
    base: "#E5E7EB",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.button
        layout
        initial={{ backgroundColor: backgroundColor[color] }}
        animate={{
          backgroundColor: disabled
            ? disabledColor[color]
            : backgroundColor[color],
        }}
        whileHover={
          !disabled ? { backgroundColor: hoverColor[color] } : undefined
        }
        whileTap={
          !disabled
            ? {
                backgroundColor: activeColor[color],
                boxShadow:
                  color === "brand"
                    ? `0 0 0 3px ${borderColor[color]}`
                    : undefined,
              }
            : undefined
        }
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          "flex w-full flex-1 items-center justify-center gap-2 rounded-[12px] px-6 py-[14px] text-base font-semibold outline-none",
          {
            "cursor-pointer !text-neutral-800": !disabled,
            "cursor-not-allowed !text-neutral-400": disabled,
            "border-2 border-neutral-200": color === "base",
          },
        )}
        style={{ maxWidth: maxWidth }}
      >
        {startIcon && <motion.span layout>{startIcon}</motion.span>}
        {children && (
          <AnimatePresence mode="wait">
            <motion.span
              key={String(children)}
              layout
              initial={{ opacity: 0, width: "60%" }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: "60%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="inline-block overflow-hidden text-ellipsis whitespace-nowrap text-white"
            >
              {children}
            </motion.span>
          </AnimatePresence>
        )}
        {endIcon && <motion.span layout>{endIcon}</motion.span>}
      </motion.button>
    </AnimatePresence>
  );
}
