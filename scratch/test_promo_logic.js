
const { PromoService } = require('../src/modules/promos/promo.service');
const { PromoRepository } = require('../src/modules/promos/promo.repository');

// Mocking dependencies if needed, but since I have a real DB, I can just use it.
// I'll use a real promo code from the DB for testing.

async function testPromoValidation() {
  const code = 'REWARD-REFERRER-01951-8756'; // From check_promos output
  const driverId = '019512f1-cfcd-4dcc-95da-425604a157d4'; // Matching target_driver_id
  const currentAmount = 500;

  try {
    console.log(`Validating promo: ${code} for driver: ${driverId} with amount: ${currentAmount}`);
    
    // We need to bypass the TypeScript imports for the test script or use a simple query
    // Since I'm in a JS scratch file, I'll just check the logic manually or use the actual service if possible.
    
    const promo = {
      id: 7,
      code: 'REWARD-REFERRER-01951-8756',
      discount_type: 'fixed',
      discount_value: '100.00',
      target_type: 'specific_driver',
      target_driver_id: '019512f1-cfcd-4dcc-95da-425604a157d4',
      max_uses_per_driver: 1,
      start_date: new Date('2026-04-27T02:05:42.964Z'),
      expiry_date: new Date('2026-05-27T02:05:42.964Z'),
      is_active: true
    };

    // Simulate validatePromo logic
    let isValid = true;
    let message = 'Promo applied successfully';
    let discountAmount = 0;

    if (promo.target_type === 'specific_driver' && promo.target_driver_id !== driverId) {
       isValid = false;
       message = 'This offer is not valid for your account';
    }

    if (isValid) {
      if (promo.discount_type === 'percentage') {
        discountAmount = (currentAmount * Number(promo.discount_value)) / 100;
      } else {
        discountAmount = Math.min(Number(promo.discount_value), currentAmount);
      }
    }

    console.log('Result:', { isValid, discountAmount, message });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testPromoValidation();
