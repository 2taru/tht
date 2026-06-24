import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus, Tag } from "lucide-react";
import type { Label as LabelType } from "@/types/domain";
import { useCreateLabel } from "@/queries/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NEW_LABEL_COLORS = [
  "#dc2626",
  "#d97706",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

interface LabelPickerProps {
  workspaceId: string | null;
  labels: LabelType[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function LabelPicker({
  workspaceId,
  labels,
  selected,
  onChange,
}: LabelPickerProps) {
  const { t } = useTranslation();
  const createLabel = useCreateLabel(workspaceId);
  const [draft, setDraft] = useState("");

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  async function handleCreate() {
    const name = draft.trim();
    if (!name) return;
    const color = NEW_LABEL_COLORS[labels.length % NEW_LABEL_COLORS.length];
    const created = await createLabel.mutateAsync({ name, color });
    setDraft("");
    onChange([...selected, created.id]);
  }

  const selectedLabels = labels.filter((l) => selected.includes(l.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          <Tag className="size-4" />
          {selectedLabels.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {selectedLabels.map((l) => (
                <span
                  key={l.id}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("tasks.addLabels")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {labels.map((l) => {
            const on = selected.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => toggle(l.id)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="flex-1 text-left">{l.name}</span>
                {on && <Check className="size-4" />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1 border-t pt-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder={t("tasks.newLabel")}
            className="h-8"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-8 shrink-0"
            onClick={handleCreate}
            disabled={!draft.trim()}
            aria-label={t("tasks.newLabel")}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
