/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Create trusted_contacts table
  pgm.createTable('trusted_contacts', {
    id: { type: 'serial', primaryKey: true },
    driver_id: { type: 'uuid', notNull: true, references: 'drivers(id)', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // 2. Create sos_events table
  pgm.createTable('sos_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    driver_id: { type: 'uuid', notNull: true, references: 'drivers(id)', onDelete: 'CASCADE' },
    trip_id: { type: 'uuid', references: 'trips(id)', onDelete: 'SET NULL' },
    status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE', check: "status IN ('ACTIVE', 'RESOLVED')" },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    resolved_at: { type: 'timestamp' },
  });

  // 3. Create sos_locations table (for real-time tracking)
  pgm.createTable('sos_locations', {
    id: { type: 'serial', primaryKey: true },
    sos_id: { type: 'uuid', notNull: true, references: 'sos_events(id)', onDelete: 'CASCADE' },
    latitude: { type: 'numeric(10, 8)', notNull: true },
    longitude: { type: 'numeric(11, 8)', notNull: true },
    timestamp: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Indexes for faster lookups
  pgm.createIndex('trusted_contacts', 'driver_id');
  pgm.createIndex('sos_events', 'driver_id');
  pgm.createIndex('sos_events', 'status');
  pgm.createIndex('sos_locations', 'sos_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('sos_locations');
  pgm.dropTable('sos_events');
  pgm.dropTable('trusted_contacts');
};
