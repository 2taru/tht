import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/** Вхід/реєстрація через Google OAuth. Після колбеку Supabase повертає на /timesheet
 *  (URL має бути у Redirect URLs прод-проєкту). Сесію підхоплює detectSessionInUrl. */
export function GoogleButton() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/timesheet` },
    });
    // Помилка лише якщо не вдалося ініціювати редірект — інакше браузер вже пішов.
    if (error) {
      setLoading(false);
      toast.error(t("auth.genericError"));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={signInWithGoogle}
      disabled={loading}
    >
      {t("auth.googleSignIn")}
    </Button>
  );
}
