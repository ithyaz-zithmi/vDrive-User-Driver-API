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
  email: {
    service: string;
    user: string;
    pass: string;
    from: string;
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
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.SMTP_USER || '',
  },
};

export default config;
