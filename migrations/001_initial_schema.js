/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Create custom types (only if not exists)
  pgm.sql(`DO $$ BEGIN
    CREATE TYPE driver_type AS ENUM ('car', 'van', 'truck');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE time_type AS ENUM ('am', 'pm');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE week_day AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'blocked', 'deleted', 'pending_verification');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('rc', 'insurance', 'vehicle_license', 'aadhaar_card');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE vehicle_type AS ENUM ('car', 'bike', 'auto', 'van', 'truck');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'electric', 'cng', 'hybrid');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  // Create trip-related enums
  pgm.sql(`DO $$ BEGIN
    CREATE TYPE ride_type_enum AS ENUM ('ONE_WAY', 'ROUND_TRIP', 'OUTSTATION', 'DAILY');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM ('DRIVER_ONLY', 'CAB_WITH_DRIVER');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE trip_status_enum AS ENUM ('REQUESTED', 'LIVE', 'COMPLETED', 'CANCELLED', 'MID_CANCELLED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE cancel_reason_enum AS ENUM ('USER_CANCELLED', 'DRIVER_CANCELLED', 'ADMIN_CANCELLED', 'CAR_BREAKDOWN', 'ACCIDENT', 'NO_SHOW', 'PAYMENT_ISSUE', 'OTHER');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE cancel_by_enum AS ENUM ('USER', 'DRIVER', 'ADMIN', 'SYSTEM');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE change_type_enum AS ENUM ('SCHEDULE_TIME', 'PICKUP_LOCATION', 'DROP_LOCATION', 'RIDE_TYPE', 'SERVICE_TYPE', 'CANCELLED', 'RESCHEDULED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  pgm.sql(`DO $$ BEGIN
    CREATE TYPE change_by_enum AS ENUM ('USER', 'DRIVER', 'ADMIN', 'SYSTEM');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  // ==============================
  // USERS TABLE
  // ==============================
  pgm.createTable(
    'users',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      first_name: { type: 'varchar(100)' },
      last_name: { type: 'varchar(100)' },
      full_name: {
        type: 'varchar(255)',
        generated: {
          expression: `CASE
          WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
          ELSE NULL
        END`,
          stored: true,
        },
      },
      phone_number: { type: 'varchar(15)', unique: true },
      alternate_contact: { type: 'varchar(15)' },
      password: { type: 'text' },
      email: { type: 'varchar(255)', unique: true },
      reset_token: { type: 'text' },
      reset_token_expiry: { type: 'timestamp with time zone' },
      status: { type: 'user_status_enum', notNull: true, default: 'active' },
      gender: { type: 'gender_enum' },
      date_of_birth: { type: 'date' },
      device_id: { type: 'varchar(100)', unique: true },
      deleted_at: { type: 'timestamp with time zone' },
      is_deleted: { type: 'boolean', default: false, notNull: true },
      created_at: {
        type: 'timestamp with time zone',
        default: pgm.func('CURRENT_TIMESTAMP'),
        notNull: true,
      },
      updated_at: {
        type: 'timestamp with time zone',
        default: pgm.func('CURRENT_TIMESTAMP'),
        notNull: true,
      },
    },
    { ifNotExists: true }
  );

  // ==============================
  // DRIVERS TABLE
  // ==============================
  pgm.createTable(
    'drivers',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
      first_name: { type: 'varchar(100)', notNull: true },
      last_name: { type: 'varchar(100)', notNull: true },
      full_name: {
        type: 'varchar(255)',
        generated: {
          expression: `CASE
          WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
          ELSE NULL
        END`,
          stored: true,
        },
      },
      phone_number: { type: 'varchar(15)', unique: true, notNull: true },
      alternate_contact: { type: 'varchar(15)' },
      email: { type: 'varchar(255)', unique: true },
      password: { type: 'text' },
      gender: { type: 'gender_enum' },
      date_of_birth: { type: 'date' },
      device_id: { type: 'varchar(100)', unique: true },
      status: { type: 'user_status_enum', notNull: true, default: 'active' },
      rating: { type: 'numeric(3,2)', default: 0, check: 'rating >= 0 AND rating <= 5' },
      total_trips: { type: 'integer', default: 0 },
      availability: { type: 'boolean', default: false },
      last_active: { type: 'timestamp' },
      kyc_status: { type: 'varchar(20)', default: 'pending' },
      reset_token: { type: 'text' },
      reset_token_expiry: { type: 'timestamp with time zone' },
      deleted_at: { type: 'timestamp with time zone' },
      is_deleted: { type: 'boolean', default: false },
      created_at: {
        type: 'timestamp with time zone',
        default: pgm.func('CURRENT_TIMESTAMP'),
        notNull: true,
      },
      updated_at: {
        type: 'timestamp with time zone',
        default: pgm.func('CURRENT_TIMESTAMP'),
        notNull: true,
      },
    },
    { ifNotExists: true }
  );

  // ==============================
  // DRIVER PROFILES TABLE (Legacy)
  // ==============================
  pgm.createTable(
    'driver_profiles',
    {
      driver_id: { type: 'uuid', primaryKey: true, references: 'drivers(id)', onDelete: 'CASCADE' },
      rating: { type: 'numeric(3,2)', default: 0, check: 'rating >= 0 AND rating <= 5' },
      total_trips: { type: 'integer', default: 0 },
      availability: { type: 'boolean', default: false },
      last_active: { type: 'timestamp' },
      kyc_status: { type: 'varchar(20)', default: 'pending' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
      updated_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
    },
    { ifNotExists: true }
  );

  // ==============================
  // VEHICLES TABLE
  // ==============================
  pgm.createTable(
    'vehicles',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      driver_id: { type: 'uuid', references: 'driver_profiles(driver_id)', onDelete: 'SET NULL' },
      vehicle_number: { type: 'varchar(20)', unique: true, notNull: true },
      model: { type: 'varchar(100)' },
      type: { type: 'vehicle_type', notNull: true },
      fuel: { type: 'fuel_type', notNull: true },
      registration_date: { type: 'date' },
      insurance_expiry: { type: 'date' },
      rc_document_url: { type: 'text' },
      active: { type: 'boolean', default: true, notNull: true },
      created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
      updated_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
    },
    { ifNotExists: true }
  );

  // ==============================
  // DRIVER DOCUMENTS TABLE
  // ==============================
  pgm.createTable(
    'driver_documents',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      driver_id: { type: 'uuid', references: 'driver_profiles(driver_id)', onDelete: 'CASCADE' },
      document_type: { type: 'document_type', notNull: true },
      document_url: { type: 'text' },
      status: { type: 'document_status', notNull: true, default: 'pending' },
      uploaded_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
      verified_at: { type: 'timestamp' },
      remarks: { type: 'text' },
    },
    { ifNotExists: true }
  );

  pgm.createConstraint('driver_documents', 'unique_driver_document_type', {
    unique: ['driver_id', 'document_type'],
  });

  // ==============================
  // DRIVER WALLET TABLE
  // ==============================
  pgm.createTable(
    'driver_wallet',
    {
      driver_id: {
        type: 'uuid',
        primaryKey: true,
        references: 'driver_profiles(driver_id)',
        onDelete: 'CASCADE',
      },
      balance: { type: 'decimal(10,2)', default: 0, check: 'balance >= 0', notNull: true },
      total_recharged: { type: 'decimal(10,2)', default: 0, notNull: true },
      total_used: { type: 'decimal(10,2)', default: 0, notNull: true },
      limit_amount: { type: 'decimal(10,2)', default: 0, notNull: true },
      last_recharge_at: { type: 'timestamp' },
    },
    { ifNotExists: true }
  );

  // ==============================
  // WALLET TRANSACTIONS TABLE
  // ==============================
  pgm.createTable(
    'wallet_transactions',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      driver_id: { type: 'uuid', references: 'driver_wallet(driver_id)', onDelete: 'CASCADE' },
      trip_id: { type: 'uuid' },
      type: {
        type: 'varchar(50)',
        notNull: true,
        check: "type IN ('credit', 'debit', 'bonus', 'penalty')",
      },
      amount: { type: 'decimal(10,2)', notNull: true, check: 'amount > 0' },
      reference: { type: 'varchar(120)' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
    },
    { ifNotExists: true }
  );

  // ==============================
  // DRIVER ACTIVITY LOGS TABLE
  // ==============================
  pgm.createTable(
    'driver_activity_logs',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      driver_id: { type: 'uuid', references: 'driver_profiles(driver_id)', onDelete: 'CASCADE' },
      action: { type: 'varchar(150)', notNull: true },
      details: { type: 'text' },
      ip_address: { type: 'inet' },
      user_agent: { type: 'text' },
      created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
    },
    { ifNotExists: true }
  );

  // ==============================
  // OTP TABLE
  // ==============================
  pgm.createTable(
    'otp',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      phone_number: { type: 'varchar(15)', notNull: true, unique: true },
      otp_hash: { type: 'text', notNull: true },
      created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
      expires_at: { type: 'timestamp', notNull: true },
      attempt_count: { type: 'integer', notNull: true, default: 1, check: 'attempt_count >= 0' },
    },
    { ifNotExists: true }
  );

  // ==============================
  // TRIPS TABLE
  // ==============================
  pgm.createTable(
    'trips',
    {
      trip_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true },
      driver_id: { type: 'uuid' },
      vehicle_id: { type: 'uuid' },
      ride_type: { type: 'ride_type_enum', notNull: true },
      service_type: { type: 'service_type_enum', notNull: true },
      trip_status: { type: 'trip_status_enum', notNull: true, default: 'REQUESTED' },
      original_scheduled_start_time: { type: 'timestamp', notNull: true },
      scheduled_start_time: { type: 'timestamp', notNull: true },
      actual_pickup_time: { type: 'timestamp' },
      actual_drop_time: { type: 'timestamp' },
      pickup_lat: { type: 'decimal(10,8)', notNull: true },
      pickup_lng: { type: 'decimal(11,8)', notNull: true },
      pickup_address: { type: 'text', notNull: true },
      drop_lat: { type: 'decimal(10,8)', notNull: true },
      drop_lng: { type: 'decimal(11,8)', notNull: true },
      drop_address: { type: 'text', notNull: true },
      distance_km: { type: 'decimal(8,2)', notNull: true },
      trip_duration_minutes: { type: 'integer', notNull: true },
      waiting_time_minutes: { type: 'integer', notNull: true, default: 0 },
      base_fare: { type: 'decimal(10,2)', notNull: true },
      waiting_charges: { type: 'decimal(10,2)', notNull: true, default: 0 },
      driver_allowance: { type: 'decimal(10,2)', notNull: true, default: 0 },
      platform_fee: { type: 'decimal(10,2)', notNull: true },
      total_fare: { type: 'decimal(10,2)', notNull: true },
      paid_amount: { type: 'decimal(10,2)', notNull: true, default: 0 },
      payment_status: { type: 'payment_status_enum', notNull: true, default: 'PENDING' },
      cancel_reason: { type: 'cancel_reason_enum' },
      cancel_by: { type: 'cancel_by_enum' },
      notes: { type: 'text' },
      rating: { type: 'numeric(2,1)', check: 'rating BETWEEN 1 AND 5' },
      re_route_id: { type: 'uuid' },
      feedback: { type: 'text' },
      assigned_at: { type: 'timestamp' },
      started_at: { type: 'timestamp' },
      ended_at: { type: 'timestamp' },
      created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
      updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    },
    { ifNotExists: true }
  );

  // ==============================
  // TRIP CHANGES TABLE
  // ==============================
  pgm.createTable(
    'trip_changes',
    {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      trip_id: { type: 'uuid', notNull: true },
      change_type: { type: 'change_type_enum', notNull: true },
      old_value: { type: 'jsonb' },
      new_value: { type: 'jsonb', notNull: true },
      changed_by: { type: 'change_by_enum', notNull: true },
      changed_at: {
        type: 'timestamp with time zone',
        default: pgm.func('CURRENT_TIMESTAMP'),
        notNull: true,
      },
      notes: { type: 'text' },
    },
    { ifNotExists: true }
  );

  // ==============================
  // INDEXES
  // ==============================
  // Users indexes
  pgm.createIndex('users', 'email', { ifNotExists: true });
  pgm.createIndex('users', 'phone_number', { ifNotExists: true });
  pgm.createIndex('users', 'status', { ifNotExists: true });
  pgm.createIndex('users', 'is_deleted', { ifNotExists: true });
  pgm.createIndex('users', 'deleted_at', { ifNotExists: true });
  pgm.createIndex('users', 'created_at', { ifNotExists: true });

  // Vehicles indexes
  pgm.createIndex('vehicles', 'driver_id', { ifNotExists: true });

  // Driver documents indexes
  pgm.createIndex('driver_documents', 'driver_id', { ifNotExists: true });
  pgm.createIndex('driver_documents', 'status', { ifNotExists: true });

  // Wallet transactions indexes
  pgm.createIndex('wallet_transactions', 'driver_id', { ifNotExists: true });

  // Driver activity logs indexes
  pgm.createIndex('driver_activity_logs', 'driver_id', { ifNotExists: true });

  // OTP indexes
  pgm.createIndex('otp', 'phone_number', { ifNotExists: true });
  pgm.createIndex('otp', 'expires_at', { ifNotExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Drop indexes first
  pgm.dropIndex('otp', 'expires_at', { ifExists: true });
  pgm.dropIndex('otp', 'phone_number', { ifExists: true });
  pgm.dropIndex('driver_activity_logs', 'driver_id', { ifExists: true });
  pgm.dropIndex('wallet_transactions', 'driver_id', { ifExists: true });
  pgm.dropIndex('driver_documents', 'status', { ifExists: true });
  pgm.dropIndex('driver_documents', 'driver_id', { ifExists: true });
  pgm.dropIndex('vehicles', 'driver_id', { ifExists: true });
  pgm.dropIndex('users', 'created_at', { ifExists: true });
  pgm.dropIndex('users', 'deleted_at', { ifExists: true });
  pgm.dropIndex('users', 'is_deleted', { ifExists: true });
  pgm.dropIndex('users', 'status', { ifExists: true });
  pgm.dropIndex('users', 'phone_number', { ifExists: true });
  pgm.dropIndex('users', 'email', { ifExists: true });

  // Drop tables (in reverse order due to foreign keys)
  pgm.dropTable('trip_changes', { ifExists: true });
  pgm.dropTable('trips', { ifExists: true });
  pgm.dropTable('otp', { ifExists: true });
  pgm.dropTable('driver_activity_logs', { ifExists: true });
  pgm.dropTable('wallet_transactions', { ifExists: true });
  pgm.dropTable('driver_wallet', { ifExists: true });
  pgm.dropTable('driver_documents', { ifExists: true });
  pgm.dropTable('vehicles', { ifExists: true });
  pgm.dropTable('driver_profiles', { ifExists: true });
  pgm.dropTable('drivers', { ifExists: true });
  pgm.dropTable('users', { ifExists: true });

  // Drop types (in reverse order)
  pgm.dropType('change_by_enum', { ifExists: true });
  pgm.dropType('change_type_enum', { ifExists: true });
  pgm.dropType('cancel_by_enum', { ifExists: true });
  pgm.dropType('cancel_reason_enum', { ifExists: true });
  pgm.dropType('payment_status_enum', { ifExists: true });
  pgm.dropType('trip_status_enum', { ifExists: true });
  pgm.dropType('service_type_enum', { ifExists: true });
  pgm.dropType('ride_type_enum', { ifExists: true });
  pgm.dropType('fuel_type', { ifExists: true });
  pgm.dropType('vehicle_type', { ifExists: true });
  pgm.dropType('document_status', { ifExists: true });
  pgm.dropType('document_type', { ifExists: true });
  pgm.dropType('user_status_enum', { ifExists: true });
  pgm.dropType('gender_enum', { ifExists: true });
  pgm.dropType('week_day', { ifExists: true });
  pgm.dropType('time_type', { ifExists: true });
  pgm.dropType('driver_type', { ifExists: true });

  // Drop extension
  pgm.dropExtension('uuid-ossp', { ifExists: true });
};
