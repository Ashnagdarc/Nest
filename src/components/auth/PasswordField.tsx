"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
    id?: string;
    label?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
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
    return { checks, score: Object.values(checks).filter(Boolean).length };
}

export function PasswordField({
    id = "password",
    label = "Password",
    placeholder = "Enter your password",
    value,
    onChange,
    showChecklist = false,
}: PasswordFieldProps) {
    const [show, setShow] = useState(false);
    const { checks, score } = useMemo(() => computeStrength(value), [value]);

    return (
        <FormItem>
            <FormLabel htmlFor={id}>{label}</FormLabel>
            <FormControl>
                <div className="relative">
                    <Input
                        id={id}
                        type={show ? "text" : "password"}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        autoComplete={showChecklist ? "new-password" : "current-password"}
                        aria-describedby={showChecklist ? `${id}-requirements` : undefined}
                        className="pr-10"
                    />
                    <button
                        type="button"
                        aria-label={show ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShow((current) => !current)}
                    >
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </FormControl>

            {showChecklist && value.length > 0 ? (
                <div id={`${id}-requirements`} aria-live="polite" className="space-y-2">
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-colors",
                                    index < score ? "bg-primary" : "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                    <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                        <li className={checks.length ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                            At least 8 characters
                        </li>
                        <li className={checks.upper ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                            One uppercase letter
                        </li>
                        <li className={checks.lower ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                            One lowercase letter
                        </li>
                        <li className={checks.number ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                            One number
                        </li>
                        <li className={checks.special ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                            One special character
                        </li>
                    </ul>
                </div>
            ) : null}

            <FormMessage />
        </FormItem>
    );
}
