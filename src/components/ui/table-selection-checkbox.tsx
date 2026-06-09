import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function TableSelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  className
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.indeterminate = indeterminate && !checked;
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className={cn(
        "h-4 w-4 rounded border-border/80 bg-white align-middle accent-[hsl(var(--primary))] outline-none ring-offset-0 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        className
      )}
    />
  );
}
