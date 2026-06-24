import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Ручне оновлення всіх даних на вимогу (доповнює авто-пулінг раз на 2 хв). */
export function RefreshButton() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetching = useIsFetching() > 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => qc.invalidateQueries()}
      disabled={fetching}
      aria-label={t("common.refresh")}
      title={t("common.refresh")}
    >
      <RefreshCw className={cn("size-4", fetching && "animate-spin")} />
    </Button>
  );
}
