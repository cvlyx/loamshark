// server/index.ts
import express from "express";

// server/routes.ts
import "dotenv/config";
import { createServer } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg2 from "pg";

// shared/schema.ts
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("borrower"),
  avatarColor: text("avatar_color").notNull().default("#0D7C66"),
  walletBalance: real("wallet_balance").notNull().default(0),
  interestRate: real("interest_rate").notNull().default(5),
  minLoan: real("min_loan").notNull().default(100),
  maxLoan: real("max_loan").notNull().default(5e3),
  repaymentDays: integer("repayment_days").notNull().default(30),
  description: text("description").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  responseTime: text("response_time").notNull().default("< 1 hour"),
  totalLoansGiven: integer("total_loans_given").notNull().default(0),
  totalAmountLent: real("total_amount_lent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lenderId: varchar("lender_id").notNull().references(() => users.id),
  borrowerId: varchar("borrower_id").notNull().references(() => users.id),
  amount: real("amount").notNull(),
  interestRate: real("interest_rate").notNull(),
  totalRepayment: real("total_repayment").notNull(),
  repaymentDays: integer("repayment_days").notNull(),
  status: text("status").notNull().default("pending"),
  purpose: text("purpose").notNull().default(""),
  amountPaid: real("amount_paid").notNull().default(0),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  approvalDate: timestamp("approval_date"),
  dueDate: timestamp("due_date")
});
var payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loanId: varchar("loan_id").notNull().references(() => loans.id),
  amount: real("amount").notNull(),
  paidAt: timestamp("paid_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  role: true
});
var loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});
var registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  role: z.enum(["lender", "borrower"])
});
var loanRequestSchema = z.object({
  lenderId: z.string(),
  amount: z.number().positive(),
  purpose: z.string().min(1)
});
var updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  interestRate: z.number().min(0.1).max(50).optional(),
  minLoan: z.number().positive().optional(),
  maxLoan: z.number().positive().optional(),
  repaymentDays: z.number().int().positive().optional(),
  description: z.string().optional(),
  walletBalance: z.number().min(0).optional()
});

// server/storage.ts
import "dotenv/config";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcrypt";
var isRenderEnv = !!process.env.RENDER;
var dbUrl = isRenderEnv ? process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL : process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL;
if (!dbUrl) {
  throw new Error("No database URL found. Set INTERNAL_DATABASE_URL or DATABASE_URL.");
}
var pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});
var db = drizzle(pool);
async function createUser(data) {
  const hashed = await bcrypt.hash(data.password, 10);
  const colors = ["#0D7C66", "#F5A623", "#3B82F6", "#8B5CF6", "#EF4444", "#EC4899"];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const [user] = await db.insert(users).values({
    username: data.username,
    password: hashed,
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    role: data.role,
    avatarColor,
    walletBalance: data.role === "lender" ? 1e4 : 0,
    description: data.role === "lender" ? "New lender on LendLink." : ""
  }).returning();
  return user;
}
async function authenticateUser(username, password) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  return valid ? user : null;
}
async function getUserById(id) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
async function updateUser(id, data) {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return user ?? null;
}
async function getLenders() {
  return db.select().from(users).where(eq(users.role, "lender")).orderBy(desc(users.createdAt));
}
async function createLoan(data) {
  const lender = await getUserById(data.lenderId);
  if (!lender) throw new Error("Lender not found");
  const rate = lender.interestRate;
  const days = lender.repaymentDays;
  const totalRepayment = data.amount * (1 + rate / 100);
  const [loan] = await db.insert(loans).values({
    lenderId: data.lenderId,
    borrowerId: data.borrowerId,
    amount: data.amount,
    interestRate: rate,
    totalRepayment,
    repaymentDays: days,
    purpose: data.purpose,
    status: "pending"
  }).returning();
  return loan;
}
async function getLoanById(id) {
  const [loan] = await db.select().from(loans).where(eq(loans.id, id));
  return loan ?? null;
}
async function getLoansByLender(lenderId) {
  return db.select().from(loans).where(eq(loans.lenderId, lenderId)).orderBy(desc(loans.requestDate));
}
async function getLoansByBorrower(borrowerId) {
  return db.select().from(loans).where(eq(loans.borrowerId, borrowerId)).orderBy(desc(loans.requestDate));
}
async function approveLoan(loanId) {
  const loan = await getLoanById(loanId);
  if (!loan || loan.status !== "pending") return null;
  const lender = await getUserById(loan.lenderId);
  if (!lender || lender.walletBalance < loan.amount) return null;
  const dueDate = /* @__PURE__ */ new Date();
  dueDate.setDate(dueDate.getDate() + loan.repaymentDays);
  await db.update(users).set({
    walletBalance: lender.walletBalance - loan.amount,
    totalLoansGiven: lender.totalLoansGiven + 1,
    totalAmountLent: lender.totalAmountLent + loan.amount
  }).where(eq(users.id, lender.id));
  const [updated] = await db.update(loans).set({ status: "active", approvalDate: /* @__PURE__ */ new Date(), dueDate }).where(eq(loans.id, loanId)).returning();
  return updated ?? null;
}
async function declineLoan(loanId) {
  const [updated] = await db.update(loans).set({ status: "declined" }).where(eq(loans.id, loanId)).returning();
  return updated ?? null;
}
async function makePayment(loanId, amount) {
  const loan = await getLoanById(loanId);
  if (!loan || loan.status !== "active") return null;
  const newAmountPaid = loan.amountPaid + amount;
  const newStatus = newAmountPaid >= loan.totalRepayment ? "completed" : "active";
  const [payment] = await db.insert(payments).values({ loanId, amount }).returning();
  const [updatedLoan] = await db.update(loans).set({ amountPaid: newAmountPaid, status: newStatus }).where(eq(loans.id, loanId)).returning();
  if (newStatus === "completed") {
    const lender = await getUserById(loan.lenderId);
    if (lender) {
      await db.update(users).set({ walletBalance: lender.walletBalance + loan.totalRepayment }).where(eq(users.id, lender.id));
    }
  }
  return { payment, loan: updatedLoan };
}
async function getPaymentsByLoan(loanId) {
  return db.select().from(payments).where(eq(payments.loanId, loanId)).orderBy(desc(payments.paidAt));
}

// server/routes.ts
function stripPassword(user) {
  const { password, ...rest } = user;
  return rest;
}
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
async function registerRoutes(app2) {
  const isRenderEnv2 = !!process.env.RENDER;
  const sessionDbUrl = isRenderEnv2 ? process.env.INTERNAL_DATABASE_URL || process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL : process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL;
  const pgPool = new pg2.Pool({
    connectionString: sessionDbUrl,
    ssl: { rejectUnauthorized: false }
  });
  const PgSession = connectPgSimple(session);
  app2.use(
    session({
      store: new PgSession({ pool: pgPool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "lendlink-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        httpOnly: true,
        secure: false,
        sameSite: "lax"
      }
    })
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }
      const user = await createUser(parsed.data);
      req.session.userId = user.id;
      res.status(201).json(stripPassword(user));
    } catch (e) {
      if (e.message?.includes("unique") || e.code === "23505") {
        return res.status(409).json({ message: "Username already taken" });
      }
      console.error("Register error:", e);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
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
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(stripPassword(user));
  });
  app2.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }
      const user = await updateUser(req.session.userId, parsed.data);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(stripPassword(user));
    } catch (e) {
      console.error("Update profile error:", e);
      res.status(500).json({ message: "Update failed" });
    }
  });
  app2.get("/api/lenders", async (_req, res) => {
    try {
      const lenders = await getLenders();
      res.json(lenders.map(stripPassword));
    } catch (e) {
      console.error("Get lenders error:", e);
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({ message: "Failed to fetch lenders" });
      } else {
        const err = e;
        res.status(500).json({ message: err?.message || "Failed to fetch lenders", stack: err?.stack });
      }
    }
  });
  app2.get("/api/lenders/:id", async (req, res) => {
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
  app2.post("/api/loans", requireAuth, async (req, res) => {
    try {
      const parsed = loanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
      }
      const loan = await createLoan({
        lenderId: parsed.data.lenderId,
        borrowerId: req.session.userId,
        amount: parsed.data.amount,
        purpose: parsed.data.purpose
      });
      res.status(201).json(loan);
    } catch (e) {
      console.error("Create loan error:", e);
      res.status(500).json({ message: e.message || "Failed to create loan" });
    }
  });
  app2.get("/api/loans", requireAuth, async (req, res) => {
    try {
      const user = await getUserById(req.session.userId);
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
              date: p.paidAt.toISOString().split("T")[0]
            }))
          };
        })
      );
      res.json(enrichedLoans);
    } catch (e) {
      console.error("Get loans error:", e);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });
  app2.get("/api/loans/:id", requireAuth, async (req, res) => {
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
          date: p.paidAt.toISOString().split("T")[0]
        }))
      });
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch loan" });
    }
  });
  app2.post("/api/loans/:id/approve", requireAuth, async (req, res) => {
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
  app2.post("/api/loans/:id/decline", requireAuth, async (req, res) => {
    try {
      const loan = await declineLoan(req.params.id);
      if (!loan) return res.status(404).json({ message: "Loan not found" });
      res.json(loan);
    } catch (e) {
      console.error("Decline loan error:", e);
      res.status(500).json({ message: "Failed to decline loan" });
    }
  });
  app2.post("/api/loans/:id/pay", requireAuth, async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = { port, host: "0.0.0.0" };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`express server serving on port ${port}`);
  });
})();
