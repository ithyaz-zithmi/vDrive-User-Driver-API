import { SosService } from '../src/modules/sos/sos.service';
import { connectDatabase, query } from '../src/shared/database';
import "dotenv/config";

async function verifyResolve() {
  const pool = await connectDatabase();
  try {
    console.log('--- SOS Resolution Verification Start ---');

    // 1. Trigger an SOS if none active
    console.log('Finding or creating an active SOS event...');
    let sosId: string;
    
    const activeSos = await query("SELECT id FROM sos_events WHERE status = 'ACTIVE' LIMIT 1");
    if (activeSos.rows.length > 0) {
      sosId = activeSos.rows[0].id;
      console.log(`Using existing active SOS: ${sosId}`);
    } else {
      // Create a dummy one for a valid driver
      const driver = await query("SELECT id FROM drivers LIMIT 1");
      if (driver.rows.length === 0) throw new Error("No drivers found to trigger SOS");
      const result = await SosService.triggerSos(driver.rows[0].id, 'driver');
      sosId = result.id;
      console.log(`Created new SOS: ${sosId}`);
    }

    // 2. Call resolveSos (Simulating Admin Action)
    console.log(`\nResolving SOS: ${sosId}...`);
    await SosService.resolveSos(sosId);

    // 3. Verify status in DB
    const updatedSos = await query("SELECT status, resolved_at FROM sos_events WHERE id = $1", [sosId]);
    console.log('\nDB Status after Resolve:', updatedSos.rows[0]);

    if (updatedSos.rows[0].status === 'RESOLVED') {
      console.log('✅ SUCCESS: SOS status updated to RESOLVED in database.');
    } else {
      console.log('❌ FAILURE: SOS status not updated.');
    }

    console.log('\nCheck the terminal logs for "SOS Alert Resolved" push notification attempt.');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await pool.end();
  }
}

verifyResolve();
