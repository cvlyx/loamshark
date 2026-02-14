import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole, UserProfile, LenderProfile, LoanRequest } from "./types";
import { seedLenders, seedLoans, seedLenderLoans } from "./seed-data";
import * as Crypto from "expo-crypto";

interface AppContextValue {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  profile: UserProfile | null;
  updateProfile: (updates: Partial<UserProfile>) => void;
  lenders: LenderProfile[];
  borrowerLoans: LoanRequest[];
  lenderLoans: LoanRequest[];
  requestLoan: (lenderId: string, amount: number, purpose: string) => void;
  approveLoan: (loanId: string) => void;
  declineLoan: (loanId: string) => void;
  makePayment: (loanId: string, amount: number) => void;
  isLoading: boolean;
  logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  ROLE: "lendlink_role",
  PROFILE: "lendlink_profile",
  BORROWER_LOANS: "lendlink_borrower_loans",
  LENDER_LOANS: "lendlink_lender_loans",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [borrowerLoans, setBorrowerLoans] = useState<LoanRequest[]>([]);
  const [lenderLoans, setLenderLoans] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [savedRole, savedProfile, savedBorrowerLoans, savedLenderLoans] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ROLE),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.BORROWER_LOANS),
        AsyncStorage.getItem(STORAGE_KEYS.LENDER_LOANS),
      ]);

      if (savedRole) setRoleState(savedRole as UserRole);
      if (savedProfile) setProfile(JSON.parse(savedProfile));
      if (savedBorrowerLoans) setBorrowerLoans(JSON.parse(savedBorrowerLoans));
      else setBorrowerLoans(seedLoans);
      if (savedLenderLoans) setLenderLoans(JSON.parse(savedLenderLoans));
      else setLenderLoans(seedLenderLoans);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function setRole(newRole: UserRole) {
    setRoleState(newRole);
    await AsyncStorage.setItem(STORAGE_KEYS.ROLE, newRole);

    const defaultProfile: UserProfile = {
      id: Crypto.randomUUID(),
      role: newRole,
      name: newRole === "lender" ? "Alex Morgan" : "Jordan Rivera",
      email: newRole === "lender" ? "alex@email.com" : "jordan@email.com",
      phone: "+1 (555) 012-3456",
      joinDate: new Date().toISOString().split("T")[0],
      walletBalance: newRole === "lender" ? 12500 : 0,
      interestRate: 5.0,
      minLoan: 100,
      maxLoan: 5000,
      repaymentDays: 30,
      description: newRole === "lender"
        ? "Reliable microlender with competitive rates and fast approvals."
        : "",
      verified: true,
    };

    setProfile(defaultProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(defaultProfile));
    await AsyncStorage.setItem(STORAGE_KEYS.BORROWER_LOANS, JSON.stringify(seedLoans));
    await AsyncStorage.setItem(STORAGE_KEYS.LENDER_LOANS, JSON.stringify(seedLenderLoans));
    setBorrowerLoans(seedLoans);
    setLenderLoans(seedLenderLoans);
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
  }

  async function requestLoan(lenderId: string, amount: number, purpose: string) {
    const lender = seedLenders.find(l => l.id === lenderId);
    if (!lender) return;

    const interest = (amount * lender.interestRate) / 100;
    const newLoan: LoanRequest = {
      id: "loan_" + Crypto.randomUUID().slice(0, 8),
      lenderId,
      lenderName: lender.name,
      borrowerName: profile?.name || "You",
      amount,
      interestRate: lender.interestRate,
      totalRepayment: amount + interest,
      repaymentDays: lender.repaymentDays,
      status: "pending",
      requestDate: new Date().toISOString().split("T")[0],
      amountPaid: 0,
      purpose,
      payments: [],
    };

    const updated = [newLoan, ...borrowerLoans];
    setBorrowerLoans(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.BORROWER_LOANS, JSON.stringify(updated));
  }

  async function approveLoan(loanId: string) {
    const now = new Date();
    const updated = lenderLoans.map(loan => {
      if (loan.id !== loanId) return loan;
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + loan.repaymentDays);
      return {
        ...loan,
        status: "active" as const,
        approvalDate: now.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
      };
    });
    setLenderLoans(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LENDER_LOANS, JSON.stringify(updated));

    if (profile) {
      const loan = lenderLoans.find(l => l.id === loanId);
      if (loan) {
        const newBalance = profile.walletBalance - loan.amount;
        await updateProfile({ walletBalance: Math.max(0, newBalance) });
      }
    }
  }

  async function declineLoan(loanId: string) {
    const updated = lenderLoans.map(loan =>
      loan.id === loanId ? { ...loan, status: "declined" as const } : loan
    );
    setLenderLoans(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.LENDER_LOANS, JSON.stringify(updated));
  }

  async function makePayment(loanId: string, amount: number) {
    const isLenderLoan = lenderLoans.some(l => l.id === loanId);
    const loans = isLenderLoan ? lenderLoans : borrowerLoans;
    const setLoans = isLenderLoan ? setLenderLoans : setBorrowerLoans;
    const key = isLenderLoan ? STORAGE_KEYS.LENDER_LOANS : STORAGE_KEYS.BORROWER_LOANS;

    const updated = loans.map(loan => {
      if (loan.id !== loanId) return loan;
      const newPaid = loan.amountPaid + amount;
      const newPayment = {
        id: "pay_" + Crypto.randomUUID().slice(0, 8),
        amount,
        date: new Date().toISOString().split("T")[0],
      };
      return {
        ...loan,
        amountPaid: newPaid,
        status: newPaid >= loan.totalRepayment ? ("completed" as const) : loan.status,
        payments: [...loan.payments, newPayment],
      };
    });

    setLoans(updated);
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    if (isLenderLoan && profile) {
      await updateProfile({ walletBalance: profile.walletBalance + amount });
    }
  }

  async function logout() {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    setRoleState(null);
    setProfile(null);
    setBorrowerLoans(seedLoans);
    setLenderLoans(seedLenderLoans);
  }

  const value = useMemo(() => ({
    role,
    setRole,
    profile,
    updateProfile,
    lenders: seedLenders,
    borrowerLoans,
    lenderLoans,
    requestLoan,
    approveLoan,
    declineLoan,
    makePayment,
    isLoading,
    logout,
  }), [role, profile, borrowerLoans, lenderLoans, isLoading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
