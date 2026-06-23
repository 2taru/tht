import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const PRESETS = [
  "#6366f1",
  "#2563eb",
  "#0ea5e9",
  "#16a34a",
  "#65a30d",
  "#d97706",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#0d9488",
  "#64748b",
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((color) => {
          const selected = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={cn(
                "flex size-7 cursor-pointer items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                selected && "ring-2 ring-ring",
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            >
              {selected && <Check className="size-4 text-white" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isValidHex(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded border bg-transparent p-0.5"
          aria-label="custom color"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="font-mono"
          aria-invalid={!isValidHex(value)}
        />
      </div>
    </div>
  );
}
