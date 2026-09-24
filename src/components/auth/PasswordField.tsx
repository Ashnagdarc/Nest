"use client";

import { useMemo, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage, useFormField } from "@/components/ui/form";
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

const REQUIREMENTS = [
    { key: "length", label: "At least 8 characters" },
    { key: "upper", label: "One uppercase letter" },
    { key: "lower", label: "One lowercase letter" },
    { key: "number", label: "One number" },
    { key: "special", label: "One special character" },
] as const;

function PasswordFieldControl({
    id,
    placeholder,
    value,
    onChange,
    showChecklist,
    show,
    setShow,
    checks,
    score,
}: {
    id: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    showChecklist: boolean;
    show: boolean;
    setShow: (value: boolean | ((current: boolean) => boolean)) => void;
    checks: ReturnType<typeof computeStrength>["checks"];
    score: number;
}) {
    const { error, formMessageId, formDescriptionId } = useFormField();
    const describedBy = [
        showChecklist && value.length > 0 ? `${id}-requirements` : null,
        error ? formMessageId : formDescriptionId,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <>
            <div className="relative">
                <FormControl>
                    <Input
                        id={id}
                        type={show ? "text" : "password"}
                        placeholder={placeholder}
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        autoComplete={showChecklist ? "new-password" : "current-password"}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={describedBy || undefined}
                        className="pr-12"
                    />
                </FormControl>
                <button
                    type="button"
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 flex h-6 min-h-6 w-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-300 transition-colors hover:text-white"
                    onClick={() => setShow((current) => !current)}
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {showChecklist && value.length > 0 ? (
                <div id={`${id}-requirements`} aria-live="polite" className="space-y-2">
                    <div className="flex gap-1" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-colors",
                                    index < score ? "bg-primary" : "bg-white/25"
                                )}
                            />
                        ))}
                    </div>
                    <ul className="grid grid-cols-1 gap-1 text-xs">
                        {REQUIREMENTS.map((requirement) => {
                            const met = checks[requirement.key];
                            return (
                                <li
                                    key={requirement.key}
                                    className={cn(
                                        "flex items-center gap-1.5",
                                        met ? "text-emerald-400" : "text-neutral-400"
                                    )}
                                >
                                    {met ? (
                                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    ) : (
                                        <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    )}
                                    <span>
                                        {requirement.label}
                                        <span className="sr-only">{met ? ", met" : ", not met"}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : null}

            <FormMessage />
        </>
    );
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
            <PasswordFieldControl
                id={id}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                showChecklist={showChecklist}
                show={show}
                setShow={setShow}
                checks={checks}
                score={score}
            />
        </FormItem>
    );
}
