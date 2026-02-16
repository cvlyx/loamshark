import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { UserRole, UserProfile, LenderProfile, LoanRequest } from "./types";
import { apiRequest, getApiUrl } from "./query-client";
import { fetch } from "expo/fetch";

interface AppContextValue {
  user: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; name: string; email: string; phone?: string; role: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<void>;
  lenders: LenderProfile[];
  refreshLenders: () => Promise<void>;
  loans: LoanRequest[];
  refreshLoans: () => Promise<void>;
  requestLoan: (lenderId: string, amount: number, purpose: string) => Promise<void>;
  approveLoan: (loanId: string) => Promise<void>;
  declineLoan: (loanId: string) => Promise<void>;
  makePayment: (loanId: string, amount: number) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lenders, setLenders] = useState<LenderProfile[]>([]);
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  const role = user?.role as UserRole | null;
  const isAuthenticated = !!user;

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const fetchJson = useCallback(async (path: string) => {
    const baseUrl = getApiUrl();
    const url = new URL(path, baseUrl);
    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchJson("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, [fetchJson]);

  const refreshLenders = useCallback(async () => {
    try {
      const data = await fetchJson("/api/lenders");
      setLenders(data);
    } catch (e) {
      console.error("Failed to fetch lenders:", e);
    }
  }, [fetchJson]);

  const refreshLoans = useCallback(async () => {
    try {
      const data = await fetchJson("/api/loans");
      setLoans(
        data.map((l: any) => ({
          ...l,
          requestDate: l.requestDate?.split("T")[0] || "",
          approvalDate: l.approvalDate?.split("T")[0],
          dueDate: l.dueDate?.split("T")[0],
        }))
      );
    } catch {
      setLoans([]);
    }
  }, [fetchJson]);

  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      refreshLenders();
      refreshLoans();
    }
  }, [user?.id]);

  const login = useCallback(async (username: string, password: string) => {
    setAuthError(null);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      setUser(data);
    } catch (e: any) {
      const msg = e.message?.includes("401")
        ? "Invalid username or password"
        : "Login failed. Please try again.";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const register = useCallback(async (data: { username: string; password: string; name: string; email: string; phone?: string; role: UserRole }) => {
    setAuthError(null);
    try {
      const res = await apiRequest("POST", "/api/auth/register", data);
      const userData = await res.json();
      setUser(userData);
    } catch (e: any) {
      const msg = e.message?.includes("409")
        ? "Username already taken"
        : "Registration failed. Please try again.";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setUser(null);
    setLoans([]);
  }, []);

  const updateProfile = useCallback(async (updates: Record<string, any>) => {
    const res = await apiRequest("PATCH", "/api/profile", updates);
    const data = await res.json();
    setUser(data);
  }, []);

  const requestLoan = useCallback(async (lenderId: string, amount: number, purpose: string) => {
    await apiRequest("POST", "/api/loans", { lenderId, amount, purpose });
    await refreshLoans();
  }, [refreshLoans]);

  const approveLoan = useCallback(async (loanId: string) => {
    await apiRequest("POST", `/api/loans/${loanId}/approve`);
    await Promise.all([refreshLoans(), refreshUser()]);
  }, [refreshLoans, refreshUser]);

  const declineLoan = useCallback(async (loanId: string) => {
    await apiRequest("POST", `/api/loans/${loanId}/decline`);
    await refreshLoans();
  }, [refreshLoans]);

  const makePayment = useCallback(async (loanId: string, amount: number) => {
    await apiRequest("POST", `/api/loans/${loanId}/pay`, { amount });
    await Promise.all([refreshLoans(), refreshUser()]);
  }, [refreshLoans, refreshUser]);

  const value = useMemo(() => ({
    user,
    role,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    lenders,
    refreshLenders,
    loans,
    refreshLoans,
    requestLoan,
    approveLoan,
    declineLoan,
    makePayment,
    authError,
    clearAuthError,
  }), [user, role, isLoading, isAuthenticated, login, register, logout, refreshUser, updateProfile, lenders, refreshLenders, loans, refreshLoans, requestLoan, approveLoan, declineLoan, makePayment, authError, clearAuthError]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
