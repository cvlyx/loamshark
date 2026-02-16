import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import {
  registerSchema,
  loginSchema,
  loanRequestSchema,
  updateProfileSchema,
} from "../shared/schema";
import {
  createUser,
  authenticateUser,
  getUserById,
  updateUser,
  getLenders,
  createLoan,
  getLoanById,
  getLoansByLender,
  getLoansByBorrower,
  approveLoan,
  declineLoan,
  makePayment,
  getPaymentsByLoan,
} from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function stripPassword(user: any) {
  const { password, ...rest } = user;
  return rest;
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({ pool: pgPool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "lendlink-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }
      const user = await createUser(parsed.data);
      req.session.userId = user.id;
      res.status(201).json(stripPassword(user));
    } catch (e: any) {
      if (e.message?.includes("unique") || e.code === "23505") {
        return res.status(409).json({ message: "Username already taken" });
      }
      console.error("Register error:", e);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      const user = await authenticateUser(parsed.data.username, parsed.data.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      res.json(stripPassword(user));
    } catch (e) {
      console.error("Login error:", e);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(stripPassword(user));
  });

  app.patch("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }
      const user = await updateUser(req.session.userId!, parsed.data);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(stripPassword(user));
    } catch (e) {
      console.error("Update profile error:", e);
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.get("/api/lenders", async (_req: Request, res: Response) => {
    try {
      const lenders = await getLenders();
      res.json(lenders.map(stripPassword));
    } catch (e) {
      console.error("Get lenders error:", e);
      res.status(500).json({ message: "Failed to fetch lenders" });
    }
  });

  app.get("/api/lenders/:id", async (req: Request, res: Response) => {
    try {
      const user = await getUserById(req.params.id);
      if (!user || user.role !== "lender") {
        return res.status(404).json({ message: "Lender not found" });
      }
      res.json(stripPassword(user));
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch lender" });
    }
  });

  app.post("/api/loans", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = loanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }
      const loan = await createLoan({
        lenderId: parsed.data.lenderId,
        borrowerId: req.session.userId!,
        amount: parsed.data.amount,
        purpose: parsed.data.purpose,
      });
      res.status(201).json(loan);
    } catch (e: any) {
      console.error("Create loan error:", e);
      res.status(500).json({ message: e.message || "Failed to create loan" });
    }
  });

  app.get("/api/loans", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      let userLoans;
      if (user.role === "lender") {
        userLoans = await getLoansByLender(user.id);
      } else {
        userLoans = await getLoansByBorrower(user.id);
      }

      const enrichedLoans = await Promise.all(
        userLoans.map(async (loan) => {
          const lender = await getUserById(loan.lenderId);
          const borrower = await getUserById(loan.borrowerId);
          const loanPayments = await getPaymentsByLoan(loan.id);
          return {
            ...loan,
            lenderName: lender?.name || "Unknown",
            borrowerName: borrower?.name || "Unknown",
            payments: loanPayments.map((p) => ({
              id: p.id,
              amount: p.amount,
              date: p.paidAt.toISOString().split("T")[0],
            })),
          };
        })
      );

      res.json(enrichedLoans);
    } catch (e) {
      console.error("Get loans error:", e);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.get("/api/loans/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const loan = await getLoanById(req.params.id);
      if (!loan) return res.status(404).json({ message: "Loan not found" });

      const lender = await getUserById(loan.lenderId);
      const borrower = await getUserById(loan.borrowerId);
      const loanPayments = await getPaymentsByLoan(loan.id);

      res.json({
        ...loan,
        lenderName: lender?.name || "Unknown",
        borrowerName: borrower?.name || "Unknown",
        payments: loanPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.paidAt.toISOString().split("T")[0],
        })),
      });
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch loan" });
    }
  });

  app.post("/api/loans/:id/approve", requireAuth, async (req: Request, res: Response) => {
    try {
      const loan = await approveLoan(req.params.id);
      if (!loan) {
        return res.status(400).json({ message: "Cannot approve this loan. Check balance and status." });
      }
      res.json(loan);
    } catch (e) {
      console.error("Approve loan error:", e);
      res.status(500).json({ message: "Failed to approve loan" });
    }
  });

  app.post("/api/loans/:id/decline", requireAuth, async (req: Request, res: Response) => {
    try {
      const loan = await declineLoan(req.params.id);
      if (!loan) return res.status(404).json({ message: "Loan not found" });
      res.json(loan);
    } catch (e) {
      console.error("Decline loan error:", e);
      res.status(500).json({ message: "Failed to decline loan" });
    }
  });

  app.post("/api/loans/:id/pay", requireAuth, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }
      const result = await makePayment(req.params.id, amount);
      if (!result) {
        return res.status(400).json({ message: "Cannot make payment on this loan" });
      }
      res.json(result);
    } catch (e) {
      console.error("Payment error:", e);
      res.status(500).json({ message: "Payment failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
