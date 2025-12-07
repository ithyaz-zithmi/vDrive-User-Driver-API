import dotenv from 'dotenv';
import { SignOptions } from 'jsonwebtoken';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    sslMode: string;
    channelBinding: string;
  };
  jwt: {
    secret: string;
    expiresIn: SignOptions['expiresIn'];
    refreshSecret: string;
    refreshExpiresIn: SignOptions['expiresIn'];
  };
  prodURL: string;
  awsServiceUrl: string;
  email: {
    service: string;
    user: string;
    pass: string;
    from: string;
  };
  auth: {
    otpExpiryTime: number;
    maxAttempts: number;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'mydb',
    sslMode: process.env.PGSSLMODE || '',
    channelBinding: process.env.PGCHANNELBINDING || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as SignOptions['expiresIn'],
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  },
  prodURL: process.env.PROD_URL || 'http://localhost:3000',
  awsServiceUrl: process.env.AWS_SERVICE_URL || 'http://localhost:1235',
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.SMTP_USER || '',
  },
  auth: {
    otpExpiryTime: Number(process.env.OTP_EXPIRY_TIME) || 5,
    maxAttempts: Number(process.env.MAX_ATTEMPTS) || 3,
  },
};

export default config;
