"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormLabel, FormMessage } from "@/components/ui/form";

interface PasswordFieldProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  showChecklist?: boolean;
}

function computeStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^\w\s]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

export function PasswordField({
  id = "password",
  label = "Password",
  placeholder = "********",
  value,
  onChange,
  showChecklist = true,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const { checks } = useMemo(() => computeStrength(value), [value]);

  return (
    <div>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            id={id}
            type={show ? "text" : "password"}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby={showChecklist ? `${id}-requirements` : undefined}
          />
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShow((s) => !s)}
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </FormControl>
      {showChecklist && (
        <div id={`${id}-requirements`} aria-live="polite" className="text-sm text-muted-foreground">
          <ul className="mt-2 space-y-1 text-xs">
            <li className={checks.length ? "text-green-500" : "text-muted-foreground"}>At least 8 characters</li>
            <li className={checks.upper ? "text-green-500" : "text-muted-foreground"}>One uppercase letter</li>
            <li className={checks.lower ? "text-green-500" : "text-muted-foreground"}>One lowercase letter</li>
            <li className={checks.number ? "text-green-500" : "text-muted-foreground"}>One number</li>
            <li className={checks.special ? "text-green-500" : "text-muted-foreground"}>One special character</li>
          </ul>
        </div>
      )}
      <FormMessage />
    </div>
  );
}
