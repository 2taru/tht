import { cn } from "@/lib/utils";

interface Props {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Проста галочка «включити сутність» для експорту/імпорту між просторами. */
export function ScopeCheckbox({ label, checked, disabled, onChange }: Props) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
