import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  loans,
  payments,
  type User,
  type Loan,
  type Payment,
} from "../shared/schema";
import bcrypt from "bcrypt";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}): Promise<User> {
  const hashed = await bcrypt.hash(data.password, 10);
  const colors = ["#0D7C66", "#F5A623", "#3B82F6", "#8B5CF6", "#EF4444", "#EC4899"];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const [user] = await db
    .insert(users)
    .values({
      username: data.username,
      password: hashed,
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      role: data.role,
      avatarColor,
      walletBalance: data.role === "lender" ? 10000 : 0,
      description: data.role === "lender" ? "New lender on LendLink." : "",
    })
    .returning();
  return user;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  return valid ? user : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function updateUser(
  id: string,
  data: Partial<Omit<User, "id" | "createdAt" | "password" | "username">>
): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return user ?? null;
}

export async function getLenders(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.role, "lender"))
    .orderBy(desc(users.createdAt));
}

export async function createLoan(data: {
  lenderId: string;
  borrowerId: string;
  amount: number;
  purpose: string;
}): Promise<Loan> {
  const lender = await getUserById(data.lenderId);
  if (!lender) throw new Error("Lender not found");

  const rate = lender.interestRate;
  const days = lender.repaymentDays;
  const totalRepayment = data.amount * (1 + rate / 100);

  const [loan] = await db
    .insert(loans)
    .values({
      lenderId: data.lenderId,
      borrowerId: data.borrowerId,
      amount: data.amount,
      interestRate: rate,
      totalRepayment,
      repaymentDays: days,
      purpose: data.purpose,
      status: "pending",
    })
    .returning();
  return loan;
}

export async function getLoanById(id: string): Promise<Loan | null> {
  const [loan] = await db.select().from(loans).where(eq(loans.id, id));
  return loan ?? null;
}

export async function getLoansByLender(lenderId: string): Promise<Loan[]> {
  return db
    .select()
    .from(loans)
    .where(eq(loans.lenderId, lenderId))
    .orderBy(desc(loans.requestDate));
}

export async function getLoansByBorrower(borrowerId: string): Promise<Loan[]> {
  return db
    .select()
    .from(loans)
    .where(eq(loans.borrowerId, borrowerId))
    .orderBy(desc(loans.requestDate));
}

export async function approveLoan(loanId: string): Promise<Loan | null> {
  const loan = await getLoanById(loanId);
  if (!loan || loan.status !== "pending") return null;

  const lender = await getUserById(loan.lenderId);
  if (!lender || lender.walletBalance < loan.amount) return null;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loan.repaymentDays);

  await db
    .update(users)
    .set({
      walletBalance: lender.walletBalance - loan.amount,
      totalLoansGiven: lender.totalLoansGiven + 1,
      totalAmountLent: lender.totalAmountLent + loan.amount,
    })
    .where(eq(users.id, lender.id));

  const [updated] = await db
    .update(loans)
    .set({ status: "active", approvalDate: new Date(), dueDate })
    .where(eq(loans.id, loanId))
    .returning();
  return updated ?? null;
}

export async function declineLoan(loanId: string): Promise<Loan | null> {
  const [updated] = await db
    .update(loans)
    .set({ status: "declined" })
    .where(eq(loans.id, loanId))
    .returning();
  return updated ?? null;
}

export async function makePayment(
  loanId: string,
  amount: number
): Promise<{ payment: Payment; loan: Loan } | null> {
  const loan = await getLoanById(loanId);
  if (!loan || loan.status !== "active") return null;

  const newAmountPaid = loan.amountPaid + amount;
  const newStatus = newAmountPaid >= loan.totalRepayment ? "completed" : "active";

  const [payment] = await db
    .insert(payments)
    .values({ loanId, amount })
    .returning();

  const [updatedLoan] = await db
    .update(loans)
    .set({ amountPaid: newAmountPaid, status: newStatus })
    .where(eq(loans.id, loanId))
    .returning();

  if (newStatus === "completed") {
    const lender = await getUserById(loan.lenderId);
    if (lender) {
      await db
        .update(users)
        .set({ walletBalance: lender.walletBalance + loan.totalRepayment })
        .where(eq(users.id, lender.id));
    }
  }

  return { payment, loan: updatedLoan };
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.loanId, loanId))
    .orderBy(desc(payments.paidAt));
}
