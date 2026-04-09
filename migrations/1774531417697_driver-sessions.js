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
  pgm.createTable(
    'driver_sessions',
    {
      user_id: {
        type: 'uuid',
        notNull: true,
        references: 'drivers(id)',
        onDelete: 'CASCADE',
      },
      device_id: { type: 'varchar(100)', notNull: true },
      role: { type: 'varchar(20)', notNull: true },
      refresh_token: { type: 'text' },
      fcm_token: { type: 'text' },
      is_active: { type: 'boolean', default: true },
      force_logout: { type: 'boolean', default: false },
      last_active: {
        type: 'timestamp with time zone',
        default: pgm.func('CURRENT_TIMESTAMP'),
      },
    },
    { ifNotExists: true }
  );

  pgm.addConstraint('driver_sessions', 'driver_sessions_pkey', {
    primaryKey: ['user_id', 'device_id'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('driver_sessions', { ifExists: true });
};

