import { useState } from "react";
import { useWorkspaces } from "@/queries/workspaces";

const STORAGE_KEY = "tht.activeWorkspaceId";

/**
 * Активний workspace. У соло — єдиний особистий; вибір зберігаємо в localStorage
 * під майбутній перемикач команд. Якщо збережений id невалідний — fallback на перший.
 */
export function useActiveWorkspace() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  const list = workspaces ?? [];
  const active = list.find((w) => w.id === selectedId) ?? list[0] ?? null;

  function selectWorkspace(id: string) {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return { workspace: active, workspaces: list, isLoading, selectWorkspace };
}
