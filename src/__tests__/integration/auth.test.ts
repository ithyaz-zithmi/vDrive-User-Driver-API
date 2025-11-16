import request from 'supertest';
import app from '../../app'; // Correct path from src/__tests__ to src/app

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('POST /api/auth/signin', () => {
    it('should validate required fields and return proper error', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({ user_name: 'test@example.com' }) // missing password
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle invalid request structure gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({ invalidData: {} }) // malformed request
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return structured error response for missing data', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({}) // completely empty
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should reject requests without refresh token cookie', async () => {
      const response = await request(app).post('/api/auth/refresh-token').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized: No access token provided');
    });

    it('should validate refresh token format', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', 'refresh_token=invalid_format_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed cookie data', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', 'malformed_cookie_data')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/signout', () => {
    it('should always allow sign out requests', async () => {
      const response = await request(app).get('/api/auth/signout').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User signed out successfully');
    });

    it('should work without authentication headers', async () => {
      const response = await request(app).get('/api/auth/signout').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle repeated sign out requests', async () => {
      // First signout
      await request(app).get('/api/auth/signout').expect(200);

      // Second signout - should still work
      const response = await request(app).get('/api/auth/signout').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/admin', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/admin')
        .send({
          name: 'Test Admin',
          contact: 'admin@test.com',
          password: 'Admin123!@#',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate admin data structure', async () => {
      const response = await request(app)
        .post('/api/auth/admin')
        .set('Authorization', 'Bearer invalid_token')
        .send({ incomplete: 'data' })
        .expect(401); // Should fail due to invalid token first

      expect(response.body.success).toBe(false);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/admin')
        .set('Authorization', 'Bearer invalid_token')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Forgot Password Flow', () => {
    it('should validate email format for password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ user_name: 'invalid-email-format' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty username', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ user_name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept valid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ user_name: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Forgot password link sent successfully');
    });
  });

  describe('Password Reset Flow', () => {
    it('should validate reset token format', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ reset_token: '', new_password: 'New123!@#' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate new password requirements', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ reset_token: '123456', new_password: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid or expired reset tokens', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ reset_token: 'invalid-token', new_password: 'Valid123!@#' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
