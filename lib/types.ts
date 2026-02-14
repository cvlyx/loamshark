export type UserRole = "lender" | "borrower";

export interface LenderProfile {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  rating: number;
  reviewCount: number;
  interestRate: number;
  minLoan: number;
  maxLoan: number;
  repaymentDays: number;
  totalLoansGiven: number;
  totalAmountLent: number;
  verified: boolean;
  description: string;
  joinDate: string;
  responseTime: string;
}

export interface LoanRequest {
  id: string;
  lenderId: string;
  lenderName: string;
  borrowerName: string;
  amount: number;
  interestRate: number;
  totalRepayment: number;
  repaymentDays: number;
  status: "pending" | "approved" | "active" | "completed" | "declined";
  requestDate: string;
  approvalDate?: string;
  dueDate?: string;
  amountPaid: number;
  purpose: string;
  payments: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  walletBalance: number;
  interestRate: number;
  minLoan: number;
  maxLoan: number;
  repaymentDays: number;
  description: string;
  verified: boolean;
}
