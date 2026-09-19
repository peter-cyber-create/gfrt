import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LoadingState from "../components/LoadingState";

export default function RequireAuth() {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();
  if (bootstrapping) {
    return (
      <div className="p-5">
        <LoadingState label="Checking session…" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
