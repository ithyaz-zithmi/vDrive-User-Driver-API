import request from 'supertest';
import app from '../../app';

describe('Driver Module Endpoints', () => {
  const testDriver = {
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '9876543210',
    email: 'john.doe@example.com',
    date_of_birth: '01-01-1990',
    gender: 'male' as const,
    device_id: 'test-device-123test-device-123', // 16+ chars
    role: 'driver' as const,
  };

  const testOtp = '123456';
  let accessToken: string;
  let refreshToken: string;
  let driverId: string;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('Driver Authentication', () => {
    test('should request OTP for driver signup', async () => {
      const response = await request(app).post('/api/auth/request-otp').send({
        phone_number: testDriver.phone_number,
        role: 'driver',
        device_id: testDriver.device_id,
        allow_new_device: true,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('expiresIn');
    });

    test('should signup driver successfully', async () => {
      const response = await request(app).post('/api/auth/drivers/signup').send(testDriver);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('phone_number', testDriver.phone_number);
      expect(response.body.data).toHaveProperty('role', 'driver');

      driverId = response.body.data.id;
    });

    test('should verify OTP and login driver', async () => {
      const response = await request(app).post('/api/auth/drivers/login').send({
        phone_number: testDriver.phone_number,
        otp: testOtp,
        device_id: testDriver.device_id,
        allow_new_device: true,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });
  });

  describe('Driver CRUD Operations', () => {
    test('should get all drivers', async () => {
      const response = await request(app)
        .get('/api/drivers')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should get driver by ID', async () => {
      const response = await request(app)
        .get(`/api/drivers/${driverId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', driverId);
    });

    test('should update driver', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const response = await request(app)
        .put(`/api/drivers/${driverId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('first_name', 'Jane');
      expect(response.body.data).toHaveProperty('last_name', 'Smith');
    });
  });

  describe('Driver Documents', () => {
    test('should upload driver document', async () => {
      const documentData = {
        documentType: 'aadhaar_card',
        documentUrl: 'https://example.com/document.pdf',
      };

      const response = await request(app)
        .post(`/api/users/documents/upload/${driverId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(documentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('document');
    });

    test('should get driver documents', async () => {
      const response = await request(app)
        .get(`/api/users/documents/driver/${driverId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(Array.isArray(response.body.documents)).toBe(true);
    });
  });

  describe('Driver Profile Access', () => {
    test('should get driver profile via /me endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', driverId);
      expect(response.body.data).toHaveProperty('role', 'driver');
    });
  });
});
