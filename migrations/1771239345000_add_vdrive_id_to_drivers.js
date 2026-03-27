/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Create sequence for auto driver ID
  pgm.createSequence('driver_vdid_seq');

  // 2. Add vdrive_id column to drivers table
  pgm.addColumns('drivers', {
    vdrive_id: { 
      type: 'varchar(20)', 
      unique: true
    },
  });

  // 3. Set default and apply to existing rows
  pgm.sql(`
    ALTER TABLE drivers 
    ALTER COLUMN vdrive_id 
    SET DEFAULT 'VDD' || LPAD(nextval('driver_vdid_seq')::text, 4, '0');
  `);

  pgm.sql(`
    UPDATE drivers 
    SET vdrive_id = 'VDD' || LPAD(nextval('driver_vdid_seq')::text, 4, '0') 
    WHERE vdrive_id IS NULL;
  `);
  
  // Make it NOT NULL after population if desired, but maybe keep it nullable for safety during migration
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('drivers', ['vdrive_id']);
  pgm.dropSequence('driver_vdid_seq');
};
