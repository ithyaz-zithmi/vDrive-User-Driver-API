import { query } from '../shared/database';

const createTables = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

  // ==============================
  // USERS TABLE
  // ==============================
  `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    alternate_contact VARCHAR(15),
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'driver')),
    gender VARCHAR(20),
    date_of_birth DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    email VARCHAR(255) UNIQUE,
    device_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `,

  // ==============================
  // OTP TABLE
  // ==============================
  ` CREATE TABLE otp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'driver')),
    otp_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    attempt_count INT NOT NULL DEFAULT 1
);`,
];

async function initDb() {
  try {
    for (const sql of createTables) {
      await query(sql);
    }
    console.log('✅ All tables are ready');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    throw err;
  }
}

export default initDb;
