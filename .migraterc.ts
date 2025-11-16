import dotenv from 'dotenv';

dotenv.config();

export default {
  migrationsTable: 'pgmigrations', // default table to track migrations
  dir: 'migrations', // your migrations folder
  direction: 'up',
  migrationsTableComment: 'db migrations',
  databaseUrl: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
};
