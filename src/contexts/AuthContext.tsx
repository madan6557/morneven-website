import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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

const AUTH_KEY = "auth_state"; // localStorage key

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved).isAuthenticated : false;
  });

  const [username, setUsername] = useState(() => {
    if (typeof window === "undefined") return "Guest";
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved).username : "Guest";
  });

  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === "undefined") return "guest";
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved).role : "guest";
  });

  // Save to localStorage whenever auth state changes
  useEffect(() => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ isAuthenticated, username, role }));
  }, [isAuthenticated, username, role]);

  const login = (email: string, _password: string) => {
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
    localStorage.removeItem(AUTH_KEY);
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
