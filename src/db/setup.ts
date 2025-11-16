import initDb from './init';
import { connectDatabase } from '../shared/database';
import config from '../config';
console.log('Environment:', config.nodeEnv);

(async () => {
  await connectDatabase();
  await initDb();
  process.exit(0);
})();
