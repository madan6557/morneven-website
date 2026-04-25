import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";
import {
  DEFAULT_PL_BY_ROLE,
  DEFAULT_TRACK_BY_ROLE,
  type PersonnelLevel,
  type PersonnelTrack,
} from "@/lib/pl";
import { listPersonnel } from "@/services/personnelApi";

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel: PersonnelLevel;
  track: PersonnelTrack;
  setPersonnelLevel: (level: PersonnelLevel) => void;
  setTrack: (track: PersonnelTrack) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => void;
  guestLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_KEY = "auth_state"; // localStorage key
const AUTHOR_ACCOUNTS = new Set(["author@morneven.com", "admin@morneven.com"]);

interface SavedAuth {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel?: PersonnelLevel;
  track?: PersonnelTrack;
}

function readSaved(): SavedAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedAuth;
  } catch {
    return null;
  }
}

function writeSavedAuth(next: {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel: PersonnelLevel;
  track: PersonnelTrack;
}) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures and keep the in-memory auth state working.
  }
}

function clearSavedAuth() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore storage failures on logout.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(() => readSaved());

  const [isAuthenticated, setIsAuthenticated] = useState(saved?.isAuthenticated ?? false);
  const [username, setUsername] = useState(saved?.username ?? "Guest");
  const [role, setRole] = useState<UserRole>(saved?.role ?? "guest");
  const [personnelLevel, setPersonnelLevel] = useState<PersonnelLevel>(
    saved?.personnelLevel ?? DEFAULT_PL_BY_ROLE[saved?.role ?? "guest"]
  );
  const [track, setTrack] = useState<PersonnelTrack>(
    saved?.track ?? DEFAULT_TRACK_BY_ROLE[saved?.role ?? "guest"]
  );

  // Save to localStorage whenever auth state changes
  useEffect(() => {
    writeSavedAuth({ isAuthenticated, username, role, personnelLevel, track });
  }, [isAuthenticated, username, role, personnelLevel, track]);

  const login = async (email: string, _password: string) => {
    const emailNorm = email.trim().toLowerCase();
    const isAuthor = AUTHOR_ACCOUNTS.has(emailNorm);
    // Cari di personnel.json
    const personnel = await listPersonnel();
    const found = personnel.find((p) => p.email.trim().toLowerCase() === emailNorm);
    if (found) {
      setIsAuthenticated(true);
      setUsername(found.username);
      setRole(found.role as UserRole);
      setPersonnelLevel(found.level as PersonnelLevel);
      setTrack(found.track as PersonnelTrack);
      return;
    }
    // fallback lama
    const nextRole: UserRole = isAuthor ? "author" : "personel";
    setIsAuthenticated(true);
    setUsername(email.split("@")[0]);
    setRole(nextRole);
    setPersonnelLevel(DEFAULT_PL_BY_ROLE[nextRole]);
    setTrack(DEFAULT_TRACK_BY_ROLE[nextRole]);
  };

  const register = (email: string, _password: string, name: string) => {
    // Per Personnel Management spec: new accounts start as PL1-GOV (Intern).
    setIsAuthenticated(true);
    setUsername(name.trim() || email.split("@")[0]);
    setRole("personel");
    setPersonnelLevel(1);
    setTrack("executive"); // GOV
  };

  const guestLogin = () => {
    setIsAuthenticated(true);
    setUsername("Guest");
    setRole("guest");
    setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
    setTrack(DEFAULT_TRACK_BY_ROLE.guest);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername("Guest");
    setRole("guest");
    setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
    setTrack(DEFAULT_TRACK_BY_ROLE.guest);
    clearSavedAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        role,
        personnelLevel,
        track,
        setPersonnelLevel,
        setTrack,
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
