import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { GoogleButton } from "./GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      ...values,
      // Лінк підтвердження має вести на наш домен, а не на дефолтний Site URL.
      options: { emailRedirectTo: `${window.location.origin}/login?registered=1` },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Якщо проєкт вимагає підтвердження email — сесії ще немає.
    if (!data.session) {
      setConfirmEmail(true);
      return;
    }
    navigate("/timesheet", { replace: true });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.registerTitle")}</CardTitle>
          <CardDescription>{t("common.appName")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmEmail ? (
            <p className="text-sm text-muted-foreground">{t("auth.confirmEmail")}</p>
          ) : (
            <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {t("auth.register")}
            </Button>
          </form>
          <GoogleButton />
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="text-foreground underline">
              {t("auth.login")}
            </Link>
          </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
