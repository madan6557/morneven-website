import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { UserRole } from "@/types";
import {
  DEFAULT_PL_BY_ROLE,
  DEFAULT_TRACK_BY_ROLE,
  type PersonnelLevel,
  type PersonnelTrack,
} from "@/lib/pl";
import {
  apiRequest,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/services/restClient";

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel: PersonnelLevel;
  track: PersonnelTrack;
  passwordSnapshot?: string;
  setPersonnelLevel: (level: PersonnelLevel) => void;
  setTrack: (track: PersonnelTrack) => void;
  login: (email: string, password: string) => Promise<void>;
  verifyPassword: (password: string) => boolean;
  register: (email: string, password: string, username: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const AUTH_KEY = "auth_state"; // localStorage key

interface BackendUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  level: PersonnelLevel;
  track: PersonnelTrack;
}

interface AuthResponse {
  token?: string;
  refreshToken?: string;
  user: BackendUser;
}

interface SavedAuth {
  isAuthenticated: boolean;
  username: string;
  role: UserRole;
  personnelLevel?: PersonnelLevel;
  track?: PersonnelTrack;
  passwordSnapshot?: string;
  token?: string;
  refreshToken?: string;
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
  passwordSnapshot?: string;
}) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures and keep the in-memory auth state working.
  }
}

function normalizeUser(user: BackendUser) {
  return {
    username: user.username,
    role: user.role,
    personnelLevel: user.level,
    track: user.track,
  };
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
  const hasDemoToken = Boolean(saved?.token?.startsWith("demo-token-") || saved?.refreshToken?.startsWith("demo-refresh-token"));

  const [isAuthenticated, setIsAuthenticated] = useState(saved?.isAuthenticated && !hasDemoToken);
  const [username, setUsername] = useState(hasDemoToken ? "Guest" : (saved?.username ?? "Guest"));
  const [role, setRole] = useState<UserRole>(hasDemoToken ? "guest" : (saved?.role ?? "guest"));
  const [personnelLevel, setPersonnelLevel] = useState<PersonnelLevel>(
    hasDemoToken ? DEFAULT_PL_BY_ROLE.guest : (saved?.personnelLevel ?? DEFAULT_PL_BY_ROLE[saved?.role ?? "guest"])
  );
  const [track, setTrack] = useState<PersonnelTrack>(
    hasDemoToken ? DEFAULT_TRACK_BY_ROLE.guest : (saved?.track ?? DEFAULT_TRACK_BY_ROLE[saved?.role ?? "guest"])
  );

  const [passwordSnapshot, setPasswordSnapshot] = useState(hasDemoToken ? "" : (saved?.passwordSnapshot ?? ""));

  useEffect(() => {
    const token = getAccessToken();
    if (!saved?.token && !token) return;

    if (token?.startsWith("demo-token-")) {
      setIsAuthenticated(false);
      setUsername("Guest");
      setRole("guest");
      setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
      setTrack(DEFAULT_TRACK_BY_ROLE.guest);
      setPasswordSnapshot("");
      clearSavedAuth();
      clearAuthTokens();
      return;
    }

    let cancelled = false;
    apiRequest<BackendUser>("/auth/me")
      .then((user) => {
        if (cancelled) return;
        const next = normalizeUser(user);
        setIsAuthenticated(true);
        setUsername(next.username);
        setRole(next.role);
        setPersonnelLevel(next.personnelLevel);
        setTrack(next.track);
      })
      .catch(() => {
        if (cancelled) return;
        setIsAuthenticated(false);
        setUsername("Guest");
        setRole("guest");
        setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
        setTrack(DEFAULT_TRACK_BY_ROLE.guest);
        setPasswordSnapshot("");
        clearSavedAuth();
        clearAuthTokens();
      });

    return () => {
      cancelled = true;
    };
  }, [saved?.token]);

  // Save to localStorage whenever auth state changes
  useEffect(() => {
    writeSavedAuth({ isAuthenticated, username, role, personnelLevel, track, passwordSnapshot });
  }, [isAuthenticated, username, role, personnelLevel, track, passwordSnapshot]);

  useEffect(() => {
    if (hasDemoToken) {
      clearSavedAuth();
      clearAuthTokens();
      return;
    }

    if (saved?.token || saved?.refreshToken) {
      setAuthTokens(saved.token ?? getAccessToken(), saved.refreshToken ?? getRefreshToken());
    }
  }, [hasDemoToken, saved?.refreshToken, saved?.token]);

  const applyAuthResponse = (data: AuthResponse, password: string) => {
    if (!data.token) throw new Error("Authentication token missing");
    setAuthTokens(data.token, data.refreshToken);
    const next = normalizeUser(data.user);
    setIsAuthenticated(true);
    setUsername(next.username);
    setRole(next.role);
    setPersonnelLevel(next.personnelLevel);
    setTrack(next.track);
    setPasswordSnapshot(password);
  };

  const login = async (email: string, password: string) => {
    const data = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), password },
      auth: false,
    });
    applyAuthResponse(data, password);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: {
        email: email.trim().toLowerCase(),
        password,
        username: name.trim() || email.split("@")[0],
      },
      auth: false,
    });
    if (data.token) {
      applyAuthResponse(data, password);
    } else {
      await login(email, password);
    }
  };

  const guestLogin = async () => {
    const data = await apiRequest<AuthResponse>("/auth/guest", { method: "POST", auth: false });
    applyAuthResponse(data, "");
  };

  const logout = () => {
    apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
    setIsAuthenticated(false);
    setUsername("Guest");
    setRole("guest");
    setPersonnelLevel(DEFAULT_PL_BY_ROLE.guest);
    setTrack(DEFAULT_TRACK_BY_ROLE.guest);
    setPasswordSnapshot("");
    clearSavedAuth();
    clearAuthTokens();
  };

  const verifyPassword = (password: string) => Boolean(passwordSnapshot) && passwordSnapshot === password;

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
        verifyPassword,
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
