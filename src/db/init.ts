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

  // ==============================
  // TRIPS TABLE & ENUMS
  // ==============================
  `CREATE TYPE ride_type_enum AS ENUM (
  'ONE_WAY',
  'ROUND_TRIP',
  'OUTSTATION',
  'DAILY'
)`,

  `CREATE TYPE service_type_enum AS ENUM (
  'DRIVER_ONLY',
  'CAB_WITH_DRIVER',
)`,

  `CREATE TYPE trip_status_enum AS ENUM (
  'REQUESTED',
  'LIVE',
  'COMPLETED',
  'CANCELLED',
  'MID_CANCELLED',
)`,

  `CREATE TYPE payment_status_enum AS ENUM (
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
)`,

  `CREATE TYPE cancel_reason_enum AS ENUM (
  'USER_CANCELLED',
  'DRIVER_CANCELLED',
  'ADMIN_CANCELLED',
  'CAR_BREAKDOWN',
  'ACCIDENT',
  'NO_SHOW',
  'PAYMENT_ISSUE',
  'OTHER',
)`,

  `CREATE TYPE cancel_by_enum AS ENUM (
  'USER',
  'DRIVER',
  'ADMIN',
  'SYSTEM',
)`,

  `CREATE TABLE trips (
  trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  driver_id UUID,
  vehicle_id UUID,
  ride_type ride_type_enum NOT NULL,
  service_type service_type_enum NOT NULL,
  trip_status trip_status_enum NOT NULL DEFAULT 'REQUESTED',
  original_scheduled_start_time TIMESTAMP NOT NULL,
  scheduled_start_time TIMESTAMP NOT NULL,
  actual_pickup_time TIMESTAMP,
  actual_drop_time TIMESTAMP,
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_lat DECIMAL(10,8) NOT NULL,
  drop_lng DECIMAL(11,8) NOT NULL,
  drop_address TEXT NOT NULL,
  distance_km DECIMAL(8,2) NOT NULL,
  trip_duration_minutes INTEGER NOT NULL,
  waiting_time_minutes INTEGER NOT NULL DEFAULT 0,
  base_fare DECIMAL(10,2) NOT NULL,
  waiting_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
  driver_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(10,2) NOT NULL,
  total_fare DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status payment_status_enum NOT NULL DEFAULT 'PENDING',
  cancel_reason cancel_reason_enum,
  cancel_by cancel_by_enum,
  notes TEXT,
  rating NUMERIC(2,1) CHECK (rating BETWEEN 1 AND 5),
  re_route_id UUID,
  feedback TEXT,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`,
  // ==============================
  // TRIPS CHANGES TABLE & ENUMS
  // ==============================
  `CREATE TYPE change_type_enum AS ENUM (
  'SCHEDULE_TIME',
  'PICKUP_LOCATION',
  'DROP_LOCATION',
  'RIDE_TYPE',
  'SERVICE_TYPE'
  'CANCELLED'
  'RESCHEDULED'
)`,

  `CREATE TYPE change_by_enum AS ENUM (
  'USER',
  'DRIVER',
  'ADMIN',
  'SYSTEM',
)`,

  `CREATE TABLE trip_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  change_type change_type_enum VARCHAR(50) NOT NULL,
  old_value JSONB NULL,
  new_value JSONB NOT NULL,
  changed_by change_by_enum VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
`,
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
