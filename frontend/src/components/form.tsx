import { parseDecimal } from "@car/shared";
import { type ReactNode, useState } from "react";
import { z } from "zod";
import { ApiError, type ValidationIssue } from "../api";

z.config({
  customError: (issue) => {
    if (issue.code === "invalid_type") {
      if (issue.input === null || issue.input === undefined) return "Required";
      if (Number.isNaN(issue.input)) return "Enter a valid number";
    }
    if (issue.code === "invalid_format" && issue.format === "date") return "Enter a valid date";
    return undefined;
  },
});

/**
 * Reads a numeric text input: empty gives null, invalid input gives NaN, so the schema
 * reports "Required" or "Enter a valid number" respectively.
 */
export function readNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  return parseDecimal(raw) ?? Number.NaN;
}

export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const showIssues = (issues: ValidationIssue[]) => {
    const next: Record<string, string> = {};
    for (const issue of issues) {
      const field = String(issue.path[0] ?? "");
      next[field] ??= issue.message;
    }
    setErrors(next);
    setFormError(next[""] ?? null);
  };

  return {
    errors,
    formError,
    /** Validates with the shared schema; returns false and shows errors when invalid. */
    check(schema: z.ZodType, value: unknown): boolean {
      const result = schema.safeParse(value);
      if (result.success) {
        setErrors({});
        setFormError(null);
        return true;
      }
      showIssues(result.error.issues);
      return false;
    },
    showError(error: unknown) {
      if (error instanceof ApiError && error.issues.length > 0) {
        showIssues(error.issues);
      } else {
        setFormError(error instanceof Error ? error.message : "Something went wrong");
      }
    },
  };
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className={`field${error ? " field-invalid" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>
        <span className="toggle-label">{label}</span>
        {description && <span className="field-hint">{description}</span>}
      </span>
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
