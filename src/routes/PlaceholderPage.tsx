import { useTranslation } from "react-i18next";

/** Тимчасова заглушка екрана — наповнюється у відповідній фазі (PLAN.md розділ 18). */
export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="text-muted-foreground">
        {t("common.appName")} — Phase 0. Цей екран зʼявиться в наступній фазі.
      </p>
    </div>
  );
}
