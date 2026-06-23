import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { NotFoundPage } from "./NotFoundPage";

// Важкі екрани — lazy (recharts, dnd-kit тощо не тягнуться у стартовий бандл).
const TimesheetPage = lazy(() =>
  import("@/features/timesheet/TimesheetPage").then((m) => ({
    default: m.TimesheetPage,
  })),
);
const TasksPage = lazy(() =>
  import("@/features/tasks/TasksPage").then((m) => ({ default: m.TasksPage })),
);
const ReportsPage = lazy(() =>
  import("@/features/reports/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);
const ProjectsPage = lazy(() =>
  import("@/features/projects/ProjectsPage").then((m) => ({
    default: m.ProjectsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/timesheet" replace /> },
          { path: "timesheet", element: <TimesheetPage /> },
          { path: "tasks", element: <TasksPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
