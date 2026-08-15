import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.info('MongoDB connected');
  createApp().listen(env.PORT, () => console.info(`Wellora API listening on ${env.PORT}`));
};

start().catch((error) => {
  console.error('Server startup failed', error instanceof Error ? error.message : error);
  process.exit(1);
});