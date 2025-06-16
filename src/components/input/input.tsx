"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ChangeEvent, useState } from "react";

export enum InputStatus {
  Default = "default",
  Error = "error",
  Warning = "warning",
  Success = "success",
}

interface InputTypeMap {
  text: string;
  number: number;
  email: string;
  password: string;
  checkbox: boolean;
  date: string;
  time: string;
  datetime_local: string;
  url: string;
  tel: string;
  search: string;
  color: string;
}

interface Props<T extends keyof InputTypeMap> {
  label?: string;
  enableInfo?: boolean;
  onInfoHover?: () => void;
  onInfo?: () => void;
  inputIcon?: React.ReactNode;
  placeholder: string;
  inputType: T;
  disabled?: boolean;
  value: InputTypeMap[T];
  onChange: (value: InputTypeMap[T]) => void;
  caption?: React.ReactNode;
  status?: InputStatus;
  maxWidth?: string;
}

export default function Input<T extends keyof InputTypeMap>({
  label,
  enableInfo,
  onInfoHover,
  onInfo,
  inputIcon,
  placeholder,
  inputType,
  disabled = false,
  value,
  onChange,
  caption,
  status = InputStatus.Default,
  maxWidth = "364px",
}: Props<T>) {
  const [showPassword, setShowPassword] = useState(false);

  const isError = status === "error";
  const isWarning = status === "warning";
  const isSuccess = status === "success";

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    let newValue: InputTypeMap[T];

    if (inputType === "checkbox") {
      newValue = e.target.checked as InputTypeMap[T];
    } else if (inputType === "number") {
      const parsed = e.target.value === "" ? "" : Number(e.target.value);
      newValue = parsed as InputTypeMap[T];
    } else {
      newValue = e.target.value as InputTypeMap[T];
    }

    onChange(newValue);
  };

  return (
    <div className={`flex flex-col space-y-2 max-w-[${maxWidth}]`}>
      <label className="flex items-center gap-1 text-sm font-medium text-white">
        {label}
        {enableInfo && (
          <span
            onMouseEnter={onInfoHover}
            onClick={onInfo}
            className="cursor-pointer text-neutral-500"
          >
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
          </span>
        )}
      </label>
      <div
        className={clsx(
          "flex h-11 w-full items-center justify-between gap-[10px] rounded-xl border bg-neutral-800 px-4 py-2 transition-all",
          {
            "border-neutral-300 focus-within:border-purple-800": !disabled,
            "!bg-neutral-100": disabled,
            "!border-red-500": isError,
            "!border-yellow-500": isWarning,
            "!border-green-500": isSuccess,
          },
        )}
      >
        <div className="flex w-full items-center gap-[10px]">
          {/* 🚨 IMPORTANT: If you use MUI Icon, You must set sx={{ fontSize: 16 }} and className='text-neutral-500' 🚨 */}
          {inputIcon}
          <input
            value={
              inputType === "checkbox"
                ? undefined
                : (value as string | number | readonly string[] | undefined)
            }
            checked={inputType === "checkbox" ? (value as boolean) : undefined}
            onChange={handleOnChange}
            type={
              inputType === "password"
                ? showPassword
                  ? "text"
                  : "password"
                : inputType === "datetime_local"
                  ? "datetime-local"
                  : inputType
            }
            placeholder={placeholder}
            className={clsx(
              "!w-full !border-0 bg-transparent !p-0 text-base font-normal text-white transition-colors focus:!ring-0",
              {
                "placeholder:text-neutral-800": disabled,
                "!text-red-500": isError,
                "!text-yellow-500": isWarning,
                "!text-green-500": isSuccess,
              },
            )}
            disabled={disabled}
          />
        </div>
        {typeof value === "string" &&
          value !== "" &&
          (inputType === "password" ? (
            <span
              onClick={() => setShowPassword(!showPassword)}
              className={clsx(
                "flex cursor-pointer text-neutral-500 transition-all",
                {
                  "!text-red-500": isError,
                  "!text-yellow-500": isWarning,
                  "!text-green-500": isSuccess,
                },
              )}
            >
              {showPassword ? (
                <VisibilityOffRoundedIcon sx={{ fontSize: 16 }} />
              ) : (
                <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
              )}
            </span>
          ) : (
            <span
              onClick={() => onChange("" as InputTypeMap[T])}
              className={clsx(
                "flex cursor-pointer text-neutral-500 transition-all",
                {
                  "!text-red-500": isError,
                  "!text-yellow-500": isWarning,
                  "!text-green-500": isSuccess,
                },
              )}
            >
              <ClearRoundedIcon sx={{ fontSize: 16 }} />
            </span>
          ))}
      </div>
      <AnimatePresence>
        {caption && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <p
              className={clsx("text-xs font-normal text-neutral-500", {
                "!text-red-500": isError,
                "!text-yellow-500": isWarning,
                "!text-green-500": isSuccess,
              })}
            >
              {caption}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
