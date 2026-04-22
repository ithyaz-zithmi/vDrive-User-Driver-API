
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'mydb',
});

async function checkSubscriptions() {
  try {
    console.log('Checking active subscriptions...');
    const result = await pool.query(`
      SELECT ds.*, rp.plan_name,
              d.full_name as driver_name, d.phone_number as driver_phone
       FROM driver_subscriptions ds
       JOIN recharge_plans rp ON ds.plan_id = rp.id
       JOIN drivers d ON ds.driver_id = d.id
       WHERE ds.status = 'active'
    `);
    console.log('Active Subscriptions found:', result.rowCount);
    console.table(result.rows);

    const allSubs = await pool.query('SELECT * FROM driver_subscriptions LIMIT 5');
    console.log('Recent subscriptions (any status):');
    console.table(allSubs.rows);

    const staleSubs = await pool.query("SELECT * FROM driver_subscriptions WHERE status = 'active' AND expiry_date < NOW()");
    console.log('Stale active subscriptions (expired but status is active):', staleSubs.rowCount);
    console.table(staleSubs.rows);

  } catch (error) {
    console.error('Error checking subscriptions:', error);
  } finally {
    await pool.end();
  }
}

checkSubscriptions();
