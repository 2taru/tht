import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : t("errors.generic");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">{t("errors.somethingWrong")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(0)}>
          {t("errors.reload")}
        </Button>
        <Button onClick={() => navigate("/timesheet")}>{t("nav.timesheet")}</Button>
      </div>
    </div>
  );
}
