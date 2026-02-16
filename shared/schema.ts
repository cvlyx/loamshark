import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("borrower"),
  avatarColor: text("avatar_color").notNull().default("#0D7C66"),
  walletBalance: real("wallet_balance").notNull().default(0),
  interestRate: real("interest_rate").notNull().default(5.0),
  minLoan: real("min_loan").notNull().default(100),
  maxLoan: real("max_loan").notNull().default(5000),
  repaymentDays: integer("repayment_days").notNull().default(30),
  description: text("description").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  responseTime: text("response_time").notNull().default("< 1 hour"),
  totalLoansGiven: integer("total_loans_given").notNull().default(0),
  totalAmountLent: real("total_amount_lent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loans = pgTable("loans", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id")
    .notNull()
    .references(() => users.id),
  borrowerId: varchar("borrower_id")
    .notNull()
    .references(() => users.id),
  amount: real("amount").notNull(),
  interestRate: real("interest_rate").notNull(),
  totalRepayment: real("total_repayment").notNull(),
  repaymentDays: integer("repayment_days").notNull(),
  status: text("status").notNull().default("pending"),
  purpose: text("purpose").notNull().default(""),
  amountPaid: real("amount_paid").notNull().default(0),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  approvalDate: timestamp("approval_date"),
  dueDate: timestamp("due_date"),
});

export const payments = pgTable("payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  loanId: varchar("loan_id")
    .notNull()
    .references(() => loans.id),
  amount: real("amount").notNull(),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  role: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  role: z.enum(["lender", "borrower"]),
});

export const loanRequestSchema = z.object({
  lenderId: z.string(),
  amount: z.number().positive(),
  purpose: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  interestRate: z.number().min(0.1).max(50).optional(),
  minLoan: z.number().positive().optional(),
  maxLoan: z.number().positive().optional(),
  repaymentDays: z.number().int().positive().optional(),
  description: z.string().optional(),
  walletBalance: z.number().min(0).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type Payment = typeof payments.$inferSelect;
