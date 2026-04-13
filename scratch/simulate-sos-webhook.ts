import axios from 'axios';

const API_KEY = 'YU}3gk~.x%c)7]a;WRZE4NZ:F>zE=';
const ADMIN_URL = 'http://localhost:3000/api/webhooks/driver-events';

const payload = {
  eventType: 'SOS_TRIGGERED',
  message: 'driver has triggered an SOS alert!',
  data: {
    id: 'sos-test-123',
    user_id: 'driver-test-456',
    user_type: 'driver',
    trip_id: 'trip-test-789',
    created_at: new Date().toISOString(),
    latitude: 13.0827,
    longitude: 80.2707,
    user: {
      full_name: 'John Doe (Test)',
      phone_number: '+919876543210',
      vdrive_id: 'VDRV123',
      type: 'driver'
    },
    trip: {
      pickup_address: 'Chennai Central Station',
      drop_address: 'T-Nagar Mall',
      status: 'ON_TRIP'
    }
  }
};

async function run() {
  try {
    const response = await axios.post(ADMIN_URL, payload, {
      headers: { 'x-api-key': API_KEY }
    });
    console.log('Webhook Response:', response.data);
  } catch (error: any) {
    console.error('Webhook Error:', error.response?.data || error.message);
  }
}

run();
