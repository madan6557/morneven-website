import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AuthorRouteProps {
  children: ReactNode;
}

export function AuthorRoute({ children }: AuthorRouteProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== "author") {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
