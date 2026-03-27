/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Rename the table
  pgm.renameTable('subscription_plans', 'recharge_plans');

  // 2. Rename columns
  pgm.renameColumn('recharge_plans', 'name', 'plan_name');

  // 3. Add price column
  pgm.addColumn('recharge_plans', {
    price: { type: 'numeric(10,2)', notNull: false },
  });

  // 4. Update price column with monthly_price values
  pgm.sql('UPDATE recharge_plans SET price = monthly_price');

  // 5. Make price column not null after seeding data
  pgm.alterColumn('recharge_plans', 'price', { notNull: true });

  // 6. Update the trigger for the renamed table
  pgm.sql(`DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON recharge_plans;`);
  pgm.sql(`CREATE TRIGGER update_recharge_plans_updated_at BEFORE UPDATE ON recharge_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // 1. Revert trigger
  pgm.sql(`DROP TRIGGER IF EXISTS update_recharge_plans_updated_at ON recharge_plans;`);
  pgm.sql(`CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON recharge_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();`);

  // 2. Revert column changes
  pgm.dropColumn('recharge_plans', 'price');
  pgm.renameColumn('recharge_plans', 'plan_name', 'name');

  // 3. Revert table name
  pgm.renameTable('recharge_plans', 'subscription_plans');
};
