/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Add missing columns to driver_documents table
  pgm.addColumns('driver_documents', {
    document_number: { type: 'varchar(100)' },
    license_status: { type: 'varchar(50)' },
    expiry_date: { type: 'date' },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('driver_documents', ['document_number', 'license_status', 'expiry_date']);
};
