import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { m } from "motion/react";
import { fromISODate } from "@/lib/dates";
import { APP_VERSION } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { CHANGELOG } from "./changelogData";

export function ChangelogPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("changelog.title")}</h1>
        <Badge variant="outline">v{APP_VERSION}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{t("changelog.subtitle")}</p>

      <ol className="space-y-4">
        {CHANGELOG.map((entry, i) => (
          <m.li
            key={entry.version}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.15) }}
            className="rounded-lg border bg-card p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>v{entry.version}</Badge>
              <span className="font-medium">{entry.title}</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {format(fromISODate(entry.date), "d MMMM yyyy", { locale: uk })}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {entry.changes.map((change, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </m.li>
        ))}
      </ol>
    </div>
  );
}
