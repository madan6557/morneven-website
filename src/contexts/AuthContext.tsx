import { createContext, useContext, useState, type ReactNode } from "react";
import type { UserRole } from "@/types";

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  login: (email: string, password: string) => void;
  register: (email: string, password: string) => void;
  guestLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("Guest");
  const [role, setRole] = useState<UserRole>("guest");

  const login = (email: string, _password: string) => {
    // Dummy: if email contains "author", set author role
    const isAuthor = email.toLowerCase().includes("author");
    setIsAuthenticated(true);
    setUsername(email.split("@")[0]);
    setRole(isAuthor ? "author" : "viewer");
  };

  const register = (email: string, _password: string) => {
    setIsAuthenticated(true);
    setUsername(email.split("@")[0]);
    setRole("viewer");
  };

  const guestLogin = () => {
    setIsAuthenticated(true);
    setUsername("Guest");
    setRole("guest");
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername("Guest");
    setRole("guest");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, role, login, register, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
