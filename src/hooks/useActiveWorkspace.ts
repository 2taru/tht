import { useSyncExternalStore } from "react";
import { useWorkspaces } from "@/queries/workspaces";

const STORAGE_KEY = "tht.activeWorkspaceId";

// Спільний зовнішній стор: id активного простору живе поза React, тож усі
// споживачі `useActiveWorkspace` реагують на зміну (перемикач → усі сторінки),
// а не тримають власну копію в useState (через що дані не оновлювались).
let selectedId: string | null =
  typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_KEY)
    : null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Синхронізація між вкладками — один глобальний слухач на модуль.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      selectedId = e.newValue;
      emit();
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return selectedId;
}

/** Встановити активний простір (оновлює localStorage і сповіщає всіх споживачів). */
export function setActiveWorkspaceId(id: string) {
  if (id === selectedId) return;
  selectedId = id;
  localStorage.setItem(STORAGE_KEY, id);
  emit();
}

/**
 * Активний workspace. Вибір зберігаємо в localStorage і транслюємо через спільний
 * стор, щоб перемикання простору миттєво оновлювало всі екрани. Якщо збережений
 * id невалідний — fallback на перший доступний.
 */
export function useActiveWorkspace() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const storedId = useSyncExternalStore(subscribe, getSnapshot);

  const list = workspaces ?? [];
  const active = list.find((w) => w.id === storedId) ?? list[0] ?? null;

  return {
    workspace: active,
    workspaces: list,
    isLoading,
    selectWorkspace: setActiveWorkspaceId,
  };
}
