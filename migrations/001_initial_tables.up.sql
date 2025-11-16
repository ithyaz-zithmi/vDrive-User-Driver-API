-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================
-- USERS TABLE
-- ==============================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  contact TEXT NOT NULL UNIQUE,
  alternate_contact VARCHAR(20),
  role VARCHAR(20) CHECK (role IN ('customer', 'admin')) NOT NULL,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

