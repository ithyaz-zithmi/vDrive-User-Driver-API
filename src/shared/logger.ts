// src/shared/logger.ts
import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf((info) => {
  const { level, message, timestamp } = info;
  return `[${timestamp}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
