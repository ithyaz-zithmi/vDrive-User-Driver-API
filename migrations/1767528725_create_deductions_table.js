/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('deductions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    driver_id: { type: 'varchar(50)', notNull: true },
    driver_name: { type: 'varchar(255)', notNull: true },
    driver_phone: { type: 'varchar(20)', notNull: true },
    amount: { type: 'numeric(12,2)', notNull: true },
    trip_id: { type: 'varchar(50)' },
    type: { type: 'varchar(50)', notNull: true },
    balance_before: { type: 'numeric(12,2)', notNull: true },
    balance_after: { type: 'numeric(12,2)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'Pending' },
    reference: { type: 'varchar(100)' },
    performed_by: { type: 'varchar(100)', notNull: true, default: 'Admin' },
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
  });

  pgm.createIndex('deductions', 'driver_id');
  pgm.createIndex('deductions', 'status');
  pgm.createIndex('deductions', 'type');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('deductions');
};
