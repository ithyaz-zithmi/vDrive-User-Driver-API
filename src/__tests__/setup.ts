import dotenv from 'dotenv';
import ms from 'ms';

// Load test environment variables
process.env.NODE_ENV = 'test';
dotenv.config({ path: '.env.test' });

// Override production environment variables for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'test_db';

// Global test setup
beforeAll(async () => {
  // Setup test database if needed
  console.log('🎯 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test database if needed
  console.log('🧹 Cleaning up test environment...');
});

beforeEach(async () => {
  // Clean up between tests
  // All mocks are already cleared by Jest
});
