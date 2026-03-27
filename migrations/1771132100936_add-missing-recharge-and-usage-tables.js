/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Create driver_recharges table
  pgm.createTable('driver_recharges', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    driver_id: { type: 'uuid', notNull: true, references: 'drivers(id)', onDelete: 'CASCADE' },
    amount: { type: 'numeric(10,2)', notNull: true },
    payment_method: { type: 'varchar(50)', notNull: true },
    reference: { type: 'varchar(120)' },
    status: { type: 'varchar(50)', notNull: true, default: 'pending' },
    created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
  });

  // 2. Create driver_credit_usage table
  pgm.createTable('driver_credit_usage', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    driver_id: { type: 'uuid', notNull: true, references: 'drivers(id)', onDelete: 'CASCADE' },
    trip_id: { type: 'uuid' },
    amount: { type: 'numeric(10,2)', notNull: true },
    type: { type: 'varchar(50)', notNull: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('NOW()'), notNull: true },
  });

  pgm.createIndex('driver_recharges', 'driver_id');
  pgm.createIndex('driver_credit_usage', 'driver_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('driver_credit_usage');
  pgm.dropTable('driver_recharges');
};
