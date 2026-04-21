import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";
import { DEFAULT_PL_BY_ROLE, type PersonnelLevel } from "@/lib/pl";

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel: PersonnelLevel;
  setPersonnelLevel: (level: PersonnelLevel) => void;
  login: (email: string, password: string) => void;
  register: (email: string, password: string, username: string) => void;
  guestLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_KEY = "auth_state"; // localStorage key
const AUTHOR_ACCOUNTS = new Set(["author@morneven.org", "admin@morneven.org"]);

interface SavedAuth {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel?: PersonnelLevel;
}

function readSaved(): SavedAuth | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedAuth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const saved = readSaved();

  const [isAuthenticated, setIsAuthenticated] = useState(saved?.isAuthenticated ?? false);
  const [username, setUsername] = useState(saved?.username ?? "Guest");
  const [role, setRole] = useState<UserRole>(saved?.role ?? "guest");
  const [personnelLevel, setPersonnelLevel] = useState<PersonnelLevel>(
    saved?.personnelLevel ?? DEFAULT_PL_BY_ROLE[saved?.role ?? "guest"]
  );

  // Save to localStorage whenever auth state changes
  useEffect(() => {
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ isAuthenticated, username, role, personnelLevel })
    );
  }, [isAuthenticated, username, role, personnelLevel]);

  const login = (email: string, _password: string) => {
    const isAuthor = AUTHOR_ACCOUNTS.has(email.trim().toLowerCase());
    const nextRole: UserRole = isAuthor ? "author" : "viewer";
    setIsAuthenticated(true);
    setUsername(email.split("@")[0]);
    setRole(nextRole);
    setPersonnelLevel(DEFAULT_PL_BY_ROLE[nextRole]);
  };

  const register = (email: string, _password: string, name: string) => {
    setIsAuthenticated(true);
    setUsername(name.trim() || email.split("@")[0]);
    setRole("viewer");
    setPersonnelLevel(DEFAULT_PL_BY_ROLE.viewer);
  };

  const guestLogin = () => {
    setIsAuthenticated(true);
    setUsername("Guest");
    setRole("guest");
    setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername("Guest");
    setRole("guest");
    setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
    localStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        role,
        personnelLevel,
        setPersonnelLevel,
        login,
        register,
        guestLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
