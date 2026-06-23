import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { TimesheetPage } from "@/features/timesheet/TimesheetPage";
import { TasksPage } from "@/features/tasks/TasksPage";
import { PlaceholderPage } from "./PlaceholderPage";
import { NotFoundPage } from "./NotFoundPage";

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
          { path: "reports", element: <PlaceholderPage titleKey="reports.title" /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "settings", element: <PlaceholderPage titleKey="settings.title" /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
