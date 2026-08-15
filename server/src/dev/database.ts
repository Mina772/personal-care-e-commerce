import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

const uriFile = resolve(process.cwd(), '.dev-mongodb-uri');
const database = await MongoMemoryServer.create({ instance: { dbName: 'wellora' } });

await writeFile(uriFile, database.getUri(), 'utf8');
console.info(`Development MongoDB ready: ${database.getUri()}`);

const shutdown = async () => {
  await database.stop();
  await unlink(uriFile).catch(() => undefined);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
await new Promise(() => undefined);