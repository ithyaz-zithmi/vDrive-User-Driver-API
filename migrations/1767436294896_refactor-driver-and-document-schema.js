/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // 1. Update Enums (Adding new values from payload)
  pgm.addValue('user_role', 'normal', { ifNotExists: true });
  pgm.addValue('user_status_enum', 'suspended', { ifNotExists: true });
  pgm.addValue('document_type', 'license', { ifNotExists: true });
  pgm.addValue('document_type', 'aadhaar', { ifNotExists: true });
  pgm.addValue('document_type', 'pan', { ifNotExists: true });
  pgm.addValue('fuel_type', 'Petrol', { ifNotExists: true });
  pgm.addValue('fuel_type', 'Diesel', { ifNotExists: true });
  pgm.addValue('vehicle_type', 'Sedan', { ifNotExists: true });
  pgm.addValue('vehicle_type', 'SUV', { ifNotExists: true });
  pgm.addValue('vehicle_type', 'Hatchback', { ifNotExists: true });

  // 2. Fix Drivers Table
  pgm.addColumns('drivers', {
    profile_pic_url: { type: 'text' },
    dob: { type: 'date' },
    address: { type: 'jsonb' },
    kyc: { type: 'jsonb', default: '{"overallStatus": "pending", "verifiedAt": null}' },
    credit: { type: 'jsonb', default: '{"limit": 0, "balance": 0, "totalRecharged": 0, "totalUsed": 0, "lastRechargeAt": null}' },
    performance: { type: 'jsonb', default: '{"averageRating": 0, "totalTrips": 0, "cancellations": 0, "lastActive": null}' },
    payments: { type: 'jsonb', default: '{"totalEarnings": 0, "pendingPayout": 0, "commissionPaid": 0}' },
    password: { type: 'text' },
  });

  // Convert full_name from generated to regular
  pgm.sql('ALTER TABLE drivers DROP COLUMN IF EXISTS full_name');
  pgm.addColumn('drivers', { full_name: { type: 'varchar(255)' } });

  // Convert availability and constraints
  pgm.sql('ALTER TABLE drivers ALTER COLUMN availability TYPE jsonb USING jsonb_build_object(\'online\', availability, \'lastActive\', last_active)');
  pgm.alterColumn('drivers', 'first_name', { allowNull: true });
  pgm.alterColumn('drivers', 'last_name', { allowNull: true });

  // 3. Fix Vehicles Table
  pgm.addColumns('vehicles', {
    vehicle_type: { type: 'varchar(100)' },
    vehicle_model: { type: 'varchar(100)' },
    fuel_type: { type: 'varchar(100)' },
    status: { type: 'boolean', default: true },
  });
  pgm.alterColumn('vehicles', 'type', { allowNull: true });
  pgm.alterColumn('vehicles', 'model', { allowNull: true });
  pgm.alterColumn('vehicles', 'fuel', { allowNull: true });

  // Redirect foreign key
  pgm.dropConstraint('vehicles', 'vehicles_driver_id_fkey', { ifExists: true });
  pgm.addConstraint('vehicles', 'vehicles_driver_id_fkey', {
    foreignKeys: {
      columns: 'driver_id',
      references: 'drivers(id)',
      onDelete: 'CASCADE'
    }
  });

  // 4. Fix Driver Documents Table (The Core Refactor)
  pgm.addColumn('driver_documents', {
    metadata: { type: 'jsonb', default: '{}' }
  });
  
  pgm.dropConstraint('driver_documents', 'driver_documents_driver_id_fkey', { ifExists: true });
  pgm.addConstraint('driver_documents', 'driver_documents_driver_id_fkey', {
    foreignKeys: {
      columns: 'driver_id',
      references: 'drivers(id)',
      onDelete: 'CASCADE'
    }
  });
};

export const down = (pgm) => {
    // Reverse operations if needed
};
