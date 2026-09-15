import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./components/AppLayout";
import AnalyticsPage from "./pages/AnalyticsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import PasswordResetConfirmPage from "./pages/PasswordResetConfirmPage";
import PerformancePage from "./pages/PerformancePage";
import RegisterPage from "./pages/RegisterPage";
import ReportsPage from "./pages/ReportsPage";
import RequisitionsPage from "./pages/RequisitionsPage";
import RolesPage from "./pages/RolesPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <div id="app">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/password/reset" element={<PasswordResetPage />} />
        <Route path="/password/reset/confirm" element={<PasswordResetConfirmPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/requisitions" element={<RequisitionsPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
