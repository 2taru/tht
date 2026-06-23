import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-muted-foreground">{t("errors.notFound")}</p>
      <Button asChild>
        <Link to="/timesheet">{t("nav.timesheet")}</Link>
      </Button>
    </div>
  );
}
