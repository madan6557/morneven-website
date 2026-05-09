import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canEnterAuthorPanel } from "@/lib/pl";

interface AuthorRouteProps {
  children: ReactNode;
}

/**
 * Guards routes that require author-panel access.
 *
 * Access rules follow the active preview clearance and track. Author accounts
 * can downshift clearance from the sidebar, so route access must not bypass
 * the current PL simulation just because the session role is author.
 */
export function AuthorRoute({ children }: AuthorRouteProps) {
  const { isAuthenticated, personnelLevel, track } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const allowed = canEnterAuthorPanel(personnelLevel, track);
  if (!allowed) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
