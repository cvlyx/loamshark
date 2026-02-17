-- Create pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (lenders and borrowers)
CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'borrower',
  avatar_color text NOT NULL DEFAULT '#0D7C66',
  wallet_balance real NOT NULL DEFAULT 0,
  interest_rate real NOT NULL DEFAULT 5.0,
  min_loan real NOT NULL DEFAULT 100,
  max_loan real NOT NULL DEFAULT 5000,
  repayment_days integer NOT NULL DEFAULT 30,
  description text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  response_time text NOT NULL DEFAULT '< 1 hour',
  total_loans_given integer NOT NULL DEFAULT 0,
  total_amount_lent real NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lender_id varchar NOT NULL REFERENCES users(id),
  borrower_id varchar NOT NULL REFERENCES users(id),
  amount real NOT NULL,
  interest_rate real NOT NULL,
  total_repayment real NOT NULL,
  repayment_days integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  purpose text NOT NULL DEFAULT '',
  amount_paid real NOT NULL DEFAULT 0,
  request_date timestamp NOT NULL DEFAULT now(),
  approval_date timestamp,
  due_date timestamp
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loan_id varchar NOT NULL REFERENCES loans(id),
  amount real NOT NULL,
  paid_at timestamp NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS loans_lender_id_idx ON loans(lender_id);
CREATE INDEX IF NOT EXISTS loans_borrower_id_idx ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON loans(status);
CREATE INDEX IF NOT EXISTS payments_loan_id_idx ON payments(loan_id);
