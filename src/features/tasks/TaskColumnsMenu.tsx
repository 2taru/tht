import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COLUMN_ORDER,
  columnLabelKey,
  type ColumnKey,
  type ColumnVisibility,
} from "./taskColumns";

interface TaskColumnsMenuProps {
  columns: ColumnVisibility;
  onToggle: (key: ColumnKey) => void;
}

export function TaskColumnsMenu({ columns, onToggle }: TaskColumnsMenuProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal className="size-4" />
          {t("tasks.columns")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("tasks.columnsTitle")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUMN_ORDER.map((key) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={columns[key]}
            // Не закривати меню після кожного тогла — зручніше вмикати кілька.
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onToggle(key)}
          >
            {t(columnLabelKey[key])}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
