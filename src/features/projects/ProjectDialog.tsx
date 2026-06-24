import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Project } from "@/types/domain";
import {
  useCreateProject,
  useUpdateProject,
  type ProjectInput,
} from "@/queries/projects";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "./ColorPicker";
import { isValidHex } from "@/lib/color";

const schema = z.object({
  name: z.string().trim().min(1),
  color: z.string().refine(isValidHex),
  // Порожньо = без ставки; інакше невідʼємне число.
  rate: z.string().refine((v) => v.trim() === "" || Number(v) >= 0, "rate"),
});
type FormValues = z.infer<typeof schema>;

interface ProjectDialogProps {
  workspaceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Якщо задано — режим редагування. */
  project?: Project | null;
}

export function ProjectDialog({
  workspaceId,
  open,
  onOpenChange,
  project,
}: ProjectDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!project;
  const create = useCreateProject(workspaceId);
  const update = useUpdateProject(workspaceId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: "#6366f1", rate: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? "",
        color: project?.color ?? "#6366f1",
        rate: project?.hourlyRate != null ? String(project.hourlyRate) : "",
      });
    }
  }, [open, project, reset]);

  async function onSubmit(values: FormValues) {
    const input: ProjectInput = {
      name: values.name.trim(),
      color: values.color,
      hourlyRate: values.rate.trim() === "" ? null : Number(values.rate),
    };
    try {
      if (isEdit && project) {
        await update.mutateAsync({ id: project.id, ...input });
      } else {
        await create.mutateAsync(input);
      }
      onOpenChange(false);
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("projects.editTitle") : t("projects.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">{t("projects.name")}</Label>
            <Input id="project-name" autoFocus {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">
                {t("projects.nameRequired")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("projects.color")}</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorPicker value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.color && (
              <p className="text-sm text-destructive">
                {t("projects.colorInvalid")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-rate">{t("projects.hourlyRate")}</Label>
            <Input
              id="project-rate"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("projects.ratePlaceholder")}
              {...register("rate")}
            />
            {errors.rate && (
              <p className="text-sm text-destructive">
                {t("projects.rateInvalid")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
