/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Create updated_at trigger function if it doesn't exist
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // 2. Create subscription_plans table
  pgm.createTable('subscription_plans', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(50)', notNull: true, unique: true },
    daily_price: { type: 'numeric(10,2)', notNull: true },
    weekly_price: { type: 'numeric(10,2)', notNull: true },
    monthly_price: { type: 'numeric(10,2)', notNull: true },
    features: { type: 'jsonb', notNull: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // 3. Create driver_subscriptions table
  pgm.createTable('driver_subscriptions', {
    id: { type: 'serial', primaryKey: true },
    driver_id: { type: 'uuid', notNull: true, references: 'drivers(id)', onDelete: 'CASCADE' },
    plan_id: { type: 'integer', notNull: true, references: 'subscription_plans(id)' },
    billing_cycle: { type: 'varchar(20)', notNull: true, check: "billing_cycle IN ('day','week','month')" },
    start_date: { type: 'timestamp', notNull: true },
    expiry_date: { type: 'timestamp', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'active', check: "status IN ('active','expired','cancelled')" },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // 4. Create payments table
  pgm.createTable('payments', {
    id: { type: 'serial', primaryKey: true },
    driver_id: { type: 'uuid', notNull: true, references: 'drivers(id)', onDelete: 'CASCADE' },
    plan_id: { type: 'integer', notNull: true, references: 'subscription_plans(id)' },
    billing_cycle: { type: 'varchar(20)', notNull: true },
    amount: { type: 'numeric(10,2)', notNull: true },
    currency: { type: 'varchar(10)', default: 'INR' },
    razorpay_order_id: { type: 'varchar(255)', notNull: true, unique: true },
    razorpay_payment_id: { type: 'varchar(255)' },
    razorpay_signature: { type: 'text' },
    status: { type: 'varchar(20)', notNull: true, default: 'pending', check: "status IN ('pending','completed','failed')" },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // 5. Create unique active subscription index
  pgm.createIndex('driver_subscriptions', 'driver_id', {
    name: 'unique_active_subscription',
    unique: true,
    where: "status = 'active'",
  });

  // 6. Create indexes for performance
  pgm.createIndex('driver_subscriptions', 'driver_id');
  pgm.createIndex('payments', 'driver_id');
  pgm.createIndex('payments', 'razorpay_order_id');

  // 7. Add updated_at triggers
  pgm.sql(`CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();`);
  pgm.sql(`CREATE TRIGGER update_driver_subscriptions_updated_at BEFORE UPDATE ON driver_subscriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();`);
  pgm.sql(`CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();`);

  // 8. Seed initial plans
  pgm.sql(`
    INSERT INTO subscription_plans (name, daily_price, weekly_price, monthly_price, features)
    VALUES 
    ('basic', 10.00, 50.00, 150.00, '{"rides_limit": 5, "priority_support": false}'),
    ('standard', 20.00, 100.00, 300.00, '{"rides_limit": 20, "priority_support": true}'),
    ('premium', 50.00, 250.00, 750.00, '{"rides_limit": -1, "priority_support": true}')
    ON CONFLICT (name) DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('payments');
  pgm.dropTable('driver_subscriptions');
  pgm.dropTable('subscription_plans');
  pgm.sql(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
};
