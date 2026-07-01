import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });

type FormValues = z.infer<typeof schema>;

/**
 * Зміна пароля залогіненого користувача. Спершу підтверджуємо особу поточним
 * паролем (`signInWithPassword`), потім оновлюємо (`updateUser`). Для акаунтів
 * лише через Google (без пароля) перевірка не пройде — це очікувано.
 */
export function ChangePasswordCard({ email }: { email: string | null }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    if (!email) return;
    setSubmitting(true);
    // 1. Підтвердження особи поточним паролем.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: values.currentPassword,
    });
    if (signInError) {
      setSubmitting(false);
      setError("currentPassword", { message: "wrong" });
      return;
    }
    // 2. Оновлення пароля.
    const { error } = await supabase.auth.updateUser({
      password: values.newPassword,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("settings.passwordChanged"));
    reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("settings.security")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">
              {t("settings.currentPassword")}
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword.message === "wrong"
                  ? t("settings.wrongPassword")
                  : t("settings.passwordRequired")}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {t("settings.newPassword")}
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">
                  {t("settings.passwordMin")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {t("settings.confirmPassword")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {t("settings.passwordMismatch")}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {t("settings.changePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
