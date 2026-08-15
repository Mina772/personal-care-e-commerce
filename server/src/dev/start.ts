import { MongoMemoryServer } from 'mongodb-memory-server-core';

const database = await MongoMemoryServer.create({ instance: { dbName: 'wellora' } });
process.env.MONGODB_URI = database.getUri('wellora');

console.info(`Development MongoDB ready: ${process.env.MONGODB_URI}`);
const { seedDatabase } = await import('../seed/index.js');
await seedDatabase({ uri: process.env.MONGODB_URI });

const shutdown = async () => {
  await database.stop();
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await import('../index.js');