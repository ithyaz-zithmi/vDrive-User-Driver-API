/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Alter document_url to JSONB. 
  // We use USING to convert existing text data to JSONB format: {"url": "old_text"}
  pgm.alterColumn('driver_documents', 'document_url', {
    type: 'jsonb',
    using: "jsonb_build_object('url', document_url)"
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // To revert, we extract the 'url' field from JSONB back to TEXT.
  // Note: If multiple fields (front/back) were added, this will only keep the one in 'url'.
  pgm.alterColumn('driver_documents', 'document_url', {
    type: 'text',
    using: "document_url->>'url'"
  });
};
