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
 * Access rules (any of these grant entry):
 *   • role === "author" (legacy author account)
 *   • PL >= L7 (Full Authority)
 *   • PL === L6 with track in (executive | field | mechanic)
 *
 * Logistics L6 and everyone L0–L5 are bounced to /home.
 */
export function AuthorRoute({ children }: AuthorRouteProps) {
  const { isAuthenticated, role, personnelLevel, track } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const allowed = role === "author" || canEnterAuthorPanel(personnelLevel, track);
  if (!allowed) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
